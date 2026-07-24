#!/usr/bin/env node
// SPDX-License-Identifier: MIT
/**
 * Backfill script: index all existing politician speeches into the vector store.
 *
 * Usage:
 *   node server/jobs/backfill-speech-vectors.js
 *   node server/jobs/backfill-speech-vectors.js --limit=100  # only 100 speeches
 *   node server/jobs/backfill-speech-vectors.js --dry-run     # count only, no indexing
 *
 * Docs: backfill-speech-vectors.doc.md
 * Purpose: One-time job to populate the LanceDB vector store with all
 *          speeches already in SQLite. After this, semantic speech search
 *          (/api/politician/speech-search) will return results.
 */

const { PrismaClient } = require("@prisma/client");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
const { PoliticianVectorStore } = require("../utils/politician/vectorStore");

// PrismaBetterSqlite3 treats `?` params as part of the filename — strip them.
const sqliteUrl = process.env.DATABASE_URL || "file:../storage/opensin.db";
const adapter = new PrismaBetterSqlite3({
  url: sqliteUrl.split("?")[0],
});
const prisma = new PrismaClient({ adapter });
const vectorStore = new PoliticianVectorStore();

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const limitArg = args.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) : null;

  const total = await prisma.politician_speeches.count();
  console.log(`[backfill] Total speeches in SQLite: ${total}`);
  if (limit) console.log(`[backfill] Limit: ${limit}`);
  if (dryRun) {
    console.log("[backfill] Dry run — no indexing will be performed.");
    await prisma.$disconnect();
    return;
  }

  // Check vector store status before
  const statsBefore = await vectorStore.stats();
  console.log(
    `[backfill] Vector store before: exists=${statsBefore.exists}, count=${statsBefore.count}`,
  );

  // Process in batches of 50 to avoid memory issues
  const BATCH_SIZE = 50;
  let indexed = 0;
  let failed = 0;
  let skipped = 0;
  const startTime = Date.now();

  for (let offset = 0; offset < total; offset += BATCH_SIZE) {
    if (limit && indexed >= limit) break;

    const speeches = await prisma.politician_speeches.findMany({
      take: BATCH_SIZE,
      skip: offset,
      orderBy: { id: "asc" },
      select: {
        id: true,
        politicianId: true,
        speakerName: true,
        speakerParty: true,
        speechText: true,
        speechTitle: true,
        speechDate: true,
        dedupeKey: true,
      },
    });

    for (const speech of speeches) {
      if (limit && indexed >= limit) break;

      if (!speech.speechText || speech.speechText.trim().length === 0) {
        skipped++;
        continue;
      }

      try {
        const result = await vectorStore.indexSpeech({
          speechId: speech.dedupeKey || String(speech.id),
          politicianId: speech.politicianId,
          politicianName: speech.speakerName,
          party: speech.speakerParty,
          text: speech.speechText,
          date: speech.speechDate,
          title: speech.speechTitle,
        });

        if (result.success) {
          indexed++;
        } else {
          failed++;
          if (failed <= 5)
            console.error(
              `[backfill] Failed: ${result.error} (speech ${speech.id})`,
            );
        }
      } catch (err) {
        failed++;
        if (failed <= 5)
          console.error(
            `[backfill] Error indexing speech ${speech.id}: ${err.message}`,
          );
      }
    }

    // Progress report every 500 speeches
    if (indexed % 500 < BATCH_SIZE) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const rate = ((indexed / (Date.now() - startTime)) * 1000).toFixed(1);
      console.log(
        `[backfill] Progress: indexed=${indexed} failed=${failed} skipped=${skipped} ` +
          `elapsed=${elapsed}s rate=${rate}/s`,
      );
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n[backfill] Done in ${elapsed}s`);
  console.log(
    `[backfill] Indexed: ${indexed}, Failed: ${failed}, Skipped: ${skipped}`,
  );

  // Check vector store status after
  const statsAfter = await vectorStore.stats();
  console.log(
    `[backfill] Vector store after: exists=${statsAfter.exists}, count=${statsAfter.count}`,
  );

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("[backfill] Fatal error:", err.message);
  await prisma
    .$disconnect()
    .catch((e) =>
      console.warn(
        "[backfill-speech-vectors] non-fatal error:",
        e?.message || e,
      ),
    );
  process.exit(1);
});
