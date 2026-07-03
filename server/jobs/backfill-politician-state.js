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
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
const {
  AbgeordnetenwatchApi,
} = require("../utils/politician/abgeordnetenwatchApi");
const {
  extractStateFromAwRawData,
  extractProfileUrlFromAwRawData,
  extractStateFromBundestagRawData,
  extractPartyFromBundestagRawData,
} = require("../utils/politician/extractors");

// PrismaBetterSqlite3 treats `?` params as part of the filename — strip them.
const sqliteUrl = process.env.DATABASE_URL || "file:../storage/openafd.db";
const adapter = new PrismaBetterSqlite3({
  url: sqliteUrl.split("?")[0],
});
const prisma = new PrismaClient({ adapter });

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
    console.log(
      `[backfill] Loaded ${byKey.size} Abgeordnetenwatch records for cross-reference`,
    );
    return byKey;
  } catch (err) {
    console.error(
      `[backfill] Failed to load Abgeordnetenwatch data: ${err.message}`,
    );
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
      let party = null;

      try {
        if (politician.source === "abgeordnetenwatch") {
          const normalized = politician.rawData
            ? JSON.parse(politician.rawData)
            : null;
          const originalMandate = normalized?.rawData || null;
          state = extractStateFromAwRawData(originalMandate);
          profileUrl = extractProfileUrlFromAwRawData(originalMandate);
        } else if (politician.source === "bundestag") {
          // First try to extract party and state directly from the DIP raw record.
          // The sync-politician-data fallback historically stored the raw DIP
          // person object but left party/state null, so we repair all three.
          const extractedParty = extractPartyFromBundestagRawData(
            politician.rawData,
          );
          state = extractStateFromBundestagRawData(politician.rawData);
          if (awLookup.size > 0) {
            const key = matchKey({
              ...politician,
              party: extractedParty || politician.party,
            });
            const awMatch = awLookup.get(key);
            if (awMatch) {
              const originalMandate = awMatch.rawData || null;
              state = state || extractStateFromAwRawData(originalMandate);
              profileUrl = extractProfileUrlFromAwRawData(originalMandate);
            }
          }
          // Repair the party column too, but only if it is currently empty.
          if (!politician.party && extractedParty) {
            party = extractedParty;
          }
        }

        const needsUpdate =
          (state && politician.state !== state) ||
          (profileUrl && politician.profileUrl !== profileUrl) ||
          (party && politician.party !== party);

        if (!needsUpdate) continue;

        if (dryRun) {
          console.log(
            `[backfill] Would update ${politician.id}: party=${party ?? politician.party}, state=${state ?? politician.state}, profileUrl=${profileUrl ?? politician.profileUrl}`,
          );
          updated++;
          continue;
        }

        await prisma.politicians.update({
          where: { id: politician.id },
          data: {
            ...(party && { party }),
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
