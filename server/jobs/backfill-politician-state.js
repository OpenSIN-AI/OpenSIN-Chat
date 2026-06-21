#!/usr/bin/env node
// SPDX-License-Identifier: MIT
/**
 * Backfill script: repair politician state and profileUrl.
 *
 * Usage:
 *   node server/jobs/backfill-politician-state.js
 *   node server/jobs/backfill-politician-state.js --dry-run     # count only, no updates
 *   node server/jobs/backfill-politician-state.js --limit=100   # only touch 100 records
 *   node server/jobs/backfill-politician-state.js --no-aw        # skip Abgeordnetenwatch cross-reference
 *
 * Purpose: One-time repair job. The Abgeordnetenwatch sync historically stored
 *          politicianApiUrl as profileUrl and left state null. For Bundestag
 *          (DIP) records, the DIP API does not expose state or a public profile
 *          URL, so we cross-reference with Abgeordnetenwatch by name + party.
 */

const { PrismaClient } = require("@prisma/client");
const { AbgeordnetenwatchApi } = require("../utils/politician/abgeordnetenwatchApi");

const prisma = new PrismaClient();

/**
 * Map a Bundestag Wahlkreis number to its German state (Bundesland).
 * Based on the official 2021 Wahlkreiseinteilung by Bundeswahlleiterin.
 * @param {number|string} number
 * @returns {string|null}
 */
function constituencyNumberToState(number) {
  const n = parseInt(number, 10);
  if (Number.isNaN(n)) return null;
  if (n >= 1 && n <= 11) return "Schleswig-Holstein";
  if (n >= 12 && n <= 17) return "Mecklenburg-Vorpommern";
  if (n >= 18 && n <= 23) return "Hamburg";
  if (n >= 24 && n <= 53) return "Niedersachsen";
  if (n >= 54 && n <= 55) return "Bremen";
  if (n >= 56 && n <= 65) return "Brandenburg";
  if (n >= 66 && n <= 74) return "Sachsen-Anhalt";
  if (n >= 75 && n <= 86) return "Berlin";
  if (n >= 87 && n <= 150) return "Nordrhein-Westfalen";
  if (n >= 151 && n <= 166) return "Sachsen";
  if (n >= 167 && n <= 188) return "Hessen";
  if (n >= 189 && n <= 196) return "Thüringen";
  if (n >= 197 && n <= 211) return "Rheinland-Pfalz";
  if (n >= 212 && n <= 257) return "Bayern";
  if (n >= 258 && n <= 295) return "Baden-Württemberg";
  if (n >= 296 && n <= 299) return "Saarland";
  return null;
}

function extractConstituencyNumber(label) {
  if (!label) return null;
  const match = String(label).match(/^\s*(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Extract the German state (Bundesland) from an Abgeordnetenwatch raw mandate.
 * Prefers the electoral_list label, falls back to the constituency number.
 * @param {string|Object} rawData
 * @returns {string|null}
 */
function extractStateFromAwRawData(rawData) {
  try {
    const data = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
    const listLabel = data?.electoral_data?.electoral_list?.label || "";
    const listMatch = listLabel.match(/Landesliste\s+(.+?)\s*\(/i);
    if (listMatch) return listMatch[1].trim();
    const constituencyLabel = data?.electoral_data?.constituency?.label || "";
    const number = extractConstituencyNumber(constituencyLabel);
    return number ? constituencyNumberToState(number) : null;
  } catch {
    return null;
  }
}

/**
 * Extract the human-readable Abgeordnetenwatch profile URL from the raw
 * candidacy-mandate object. The API URL is stored in `politicianApiUrl`, but the
 * public profile page is at `politician.abgeordnetenwatch_url`.
 * @param {string|Object} rawData
 * @returns {string|null}
 */
function extractProfileUrlFromAwRawData(rawData) {
  try {
    const data = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
    return data?.politician?.abgeordnetenwatch_url || null;
  } catch {
    return null;
  }
}

/**
 * Extract the German state (Bundesland) from a Bundestag (DIP) raw record.
 * Some DIP person records contain a `person_roles` array with a `bundesland`
 * field (e.g. Ministerpräsidenten, Staatssekretäre). We prefer the most recent
 * role with a `bundesland` value.
 * @param {string|Object} rawData
 * @returns {string|null}
 */
function extractStateFromBundestagRawData(rawData) {
  try {
    const data = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
    const roles = data?.person_roles;
    if (!Array.isArray(roles)) return null;
    for (const role of roles) {
      if (role?.bundesland) return role.bundesland.trim();
    }
    return null;
  } catch {
    return null;
  }
}

function normalizeName(name) {
  return (name || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function matchKey(p) {
  return `${normalizeName(p.fullName)}|${p.party || ""}`;
}

async function loadAwLookup() {
  try {
    const api = new AbgeordnetenwatchApi();
    const politicians = await api.fetchAllPoliticians({ enrich: false });
    const byKey = new Map();
    for (const p of politicians) {
      const key = matchKey(p);
      if (!byKey.has(key)) byKey.set(key, p);
    }
    console.log(`[backfill] Loaded ${byKey.size} Abgeordnetenwatch records for cross-reference`);
    return byKey;
  } catch (err) {
    console.error(`[backfill] Failed to load Abgeordnetenwatch data: ${err.message}`);
    return new Map();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const noAw = args.includes("--no-aw");
  const limitArg = args.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) : null;

  const total = await prisma.politicians.count();
  console.log(`[backfill] Total politicians: ${total}`);
  if (limit) console.log(`[backfill] Limit: ${limit}`);
  if (dryRun) console.log("[backfill] Dry run — no updates will be performed.");

  const awLookup = noAw ? new Map() : await loadAwLookup();

  const BATCH_SIZE = 100;
  let processed = 0;
  let updated = 0;
  let failed = 0;
  const startTime = Date.now();

  for (let offset = 0; offset < total; offset += BATCH_SIZE) {
    if (limit && processed >= limit) break;

    const politicians = await prisma.politicians.findMany({
      take: BATCH_SIZE,
      skip: offset,
      orderBy: { id: "asc" },
      select: {
        id: true,
        source: true,
        state: true,
        profileUrl: true,
        rawData: true,
        fullName: true,
        party: true,
      },
    });

    for (const politician of politicians) {
      if (limit && processed >= limit) break;
      processed++;

      let state = null;
      let profileUrl = null;

      try {
        if (politician.source === "abgeordnetenwatch") {
          const normalized = politician.rawData
            ? JSON.parse(politician.rawData)
            : null;
          const originalMandate = normalized?.rawData || null;
          state = extractStateFromAwRawData(originalMandate);
          profileUrl = extractProfileUrlFromAwRawData(originalMandate);
        } else if (politician.source === "bundestag") {
          // First try to extract state directly from the DIP raw record (some
          // roles carry a bundesland field). Then cross-reference with
          // Abgeordnetenwatch for a public profile URL and a more precise state.
          state = extractStateFromBundestagRawData(politician.rawData);
          if (awLookup.size > 0) {
            const awMatch = awLookup.get(matchKey(politician));
            if (awMatch) {
              const originalMandate = awMatch.rawData || null;
              state = state || extractStateFromAwRawData(originalMandate);
              profileUrl = extractProfileUrlFromAwRawData(originalMandate);
            }
          }
        }

        const needsUpdate =
          (state && politician.state !== state) ||
          (profileUrl && politician.profileUrl !== profileUrl);

        if (!needsUpdate) continue;

        if (dryRun) {
          console.log(
            `[backfill] Would update ${politician.id}: state=${state ?? politician.state}, profileUrl=${profileUrl ?? politician.profileUrl}`,
          );
          updated++;
          continue;
        }

        await prisma.politicians.update({
          where: { id: politician.id },
          data: {
            ...(state && { state }),
            ...(profileUrl && { profileUrl }),
          },
        });
        updated++;
      } catch (err) {
        failed++;
        if (failed <= 5) {
          console.error(
            `[backfill] Error processing ${politician.id}: ${err.message}`,
          );
        }
      }
    }

    if (processed % 500 < BATCH_SIZE) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(
        `[backfill] Progress: processed=${processed} updated=${updated} failed=${failed} elapsed=${elapsed}s`,
      );
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n[backfill] Done in ${elapsed}s`);
  console.log(
    `[backfill] Processed: ${processed}, Updated: ${updated}, Failed: ${failed}`,
  );

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("[backfill] Fatal error:", err.message);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
