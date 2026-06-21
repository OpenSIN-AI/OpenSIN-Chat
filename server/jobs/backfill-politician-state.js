#!/usr/bin/env node
// SPDX-License-Identifier: MIT
/**
 * Backfill script: repair politician state and profileUrl from raw Abgeordnetenwatch data.
 *
 * Usage:
 *   node server/jobs/backfill-politician-state.js
 *   node server/jobs/backfill-politician-state.js --dry-run     # count only, no updates
 *   node server/jobs/backfill-politician-state.js --limit=100   # only touch 100 records
 *
 * Purpose: One-time repair job. The Abgeordnetenwatch sync historically stored
 *          politicianApiUrl as profileUrl and left state null. This script extracts
 *          the public profile URL and the German state (Bundesland) from the raw
 *          candidacy-mandate JSON and writes them back to the politicians table.
 */

const { PrismaClient } = require("@prisma/client");

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

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const limitArg = args.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) : null;

  const total = await prisma.politicians.count();
  console.log(`[backfill] Total politicians in SQLite: ${total}`);
  if (limit) console.log(`[backfill] Limit: ${limit}`);
  if (dryRun) console.log("[backfill] Dry run — no updates will be performed.");

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
      },
    });

    for (const politician of politicians) {
      if (limit && processed >= limit) break;
      processed++;

      // Only Abgeordnetenwatch records carry the Landesliste shape we know how to parse.
      if (politician.source !== "abgeordnetenwatch") {
        continue;
      }

      try {
        const normalized = politician.rawData
          ? JSON.parse(politician.rawData)
          : null;
        const originalMandate = normalized?.rawData || null;

        const state = extractStateFromAwRawData(originalMandate);
        const profileUrl = extractProfileUrlFromAwRawData(originalMandate);

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
