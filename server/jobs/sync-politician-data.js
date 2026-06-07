// SPDX-License-Identifier: MIT
/**
 * Bree job: sync-politician-data
 *
 * Periodically fetches politician data from Bundestag API and
 * Abgeordnetenwatch, upserts into the database, and syncs Plenarprotokolle
 * speeches for AfD members. Each phase runs independently with retry logic
 * so a single failure cannot abort the entire job.
 *
 * Docs: sync-politician-data.doc.md
 * Purpose: Background sync job that keeps politician database current.
 * Runs every 6 hours via Bree scheduler (configured in BackgroundWorkers/index.js).
 *
 * Phases:
 *   1. Bundestag members (fetchAllMembers → upsert)
 *   2. Abgeordnetenwatch politicians (fetchAllPoliticians → create-if-missing)
 *   3. Plenarprotokolle speeches for current + previous electoral term
 */

const { PrismaClient } = require("@prisma/client");
const { BundestagApi } = require("../utils/politician/bundestagApi");
const { AbgeordnetenwatchApi } = require("../utils/politician/abgeordnetenwatchApi");
const { PlenarScraper } = require("../utils/politician/plenarScraper");

const prisma = new PrismaClient();
const bundestag = new BundestagApi();
const abgeordnetenwatch = new AbgeordnetenwatchApi();
const plenar = new PlenarScraper();

// ── Configuration ─────────────────────────────────────────────────────────────

/** Current Bundestag electoral term (Wahlperiode). */
const CURRENT_WAHLPERIODE = parseInt(
  process.env.BUNDESTAG_WAHLPERIODE || "20",
  10
);

/**
 * Number of recent sittings to sync per run. Keeping this small prevents the
 * 30-minute Bree timeout from being exceeded on first run. Historical backfill
 * should be done manually via the CLI trigger.
 */
const SITTINGS_PER_RUN = parseInt(
  process.env.POLITICIAN_SYNC_SITTINGS_PER_RUN || "5",
  10
);

/** Retry configuration for individual record upserts. */
const MAX_RECORD_RETRIES = 3;
const RECORD_RETRY_DELAY_MS = 500;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Sleep for `ms` milliseconds.
 * @param {number} ms
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry an async operation with exponential back-off.
 * @template T
 * @param {() => Promise<T>} fn
 * @param {number} [maxAttempts=3]
 * @param {number} [baseDelayMs=500]
 * @returns {Promise<T>}
 */
async function withRetry(fn, maxAttempts = MAX_RECORD_RETRIES, baseDelayMs = RECORD_RETRY_DELAY_MS) {
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < maxAttempts) await sleep(baseDelayMs * attempt);
    }
  }
  throw lastErr;
}

/**
 * Create a sync log entry, run `fn`, and update the log on completion/failure.
 * @param {string} source
 * @param {(logId: string) => Promise<object>} fn - must return a result object with {processed, failed, total}
 */
async function withSyncLog(source, fn) {
  const log = await prisma.politician_sync_log.create({
    data: { source, status: "started" },
  });

  try {
    await prisma.politician_sync_log.update({
      where: { id: log.id },
      data: { status: "running" },
    });

    const result = await fn(log.id);

    await prisma.politician_sync_log.update({
      where: { id: log.id },
      data: {
        status: "completed",
        itemsTotal: result.total ?? 0,
        itemsProcessed: result.processed ?? 0,
        itemsFailed: result.failed ?? 0,
        completedAt: new Date(),
      },
    });

    return result;
  } catch (err) {
    await prisma.politician_sync_log.update({
      where: { id: log.id },
      data: { status: "failed", error: err.message, completedAt: new Date() },
    });
    throw err;
  }
}

// ── Phase 1: Bundestag Members ────────────────────────────────────────────────

async function syncBundestagMembers() {
  return withSyncLog("bundestag", async () => {
    const members = await bundestag.fetchAllMembers();
    let processed = 0;
    let failed = 0;

    for (const member of members) {
      if (!member.firstName && !member.lastName) continue;

      try {
        await withRetry(() =>
          prisma.politicians.upsert({
            where: { externalId: member.externalId || `bundestag-${member.id}` },
            update: {
              title: member.title,
              firstName: member.firstName,
              lastName: member.lastName,
              fullName: member.fullName,
              party: member.party,
              faction: member.faction,
              gender: member.gender,
              birthDate: member.birthDate ? new Date(member.birthDate) : null,
              birthPlace: member.birthPlace,
              profession: member.profession,
              education: member.education,
              photoUrl: member.photoUrl,
              profileUrl: member.profileUrl,
              email: member.email,
              electoralDistrict: member.electoralDistrict,
              electoralList: member.electoralList,
              state: member.state,
              bio: member.bio,
              websiteUrl: member.websiteUrl,
              rawData: member.rawData,
              lastSyncedAt: new Date(),
            },
            create: {
              id: member.externalId || `bundestag-${member.id}`,
              externalId: member.externalId || `bundestag-${member.id}`,
              source: "bundestag",
              title: member.title,
              firstName: member.firstName,
              lastName: member.lastName,
              fullName: member.fullName,
              party: member.party,
              faction: member.faction,
              gender: member.gender,
              birthDate: member.birthDate ? new Date(member.birthDate) : null,
              birthPlace: member.birthPlace,
              profession: member.profession,
              education: member.education,
              photoUrl: member.photoUrl,
              profileUrl: member.profileUrl,
              email: member.email,
              electoralDistrict: member.electoralDistrict,
              electoralList: member.electoralList,
              state: member.state,
              bio: member.bio,
              websiteUrl: member.websiteUrl,
              rawData: member.rawData,
            },
          })
        );
        processed++;
      } catch {
        failed++;
      }
    }

    return { total: members.length, processed, failed };
  });
}

// ── Phase 2: Abgeordnetenwatch ────────────────────────────────────────────────

async function syncAbgeordnetenwatch() {
  return withSyncLog("abgeordnetenwatch", async () => {
    const politicians = await abgeordnetenwatch.fetchAllPoliticians();
    let processed = 0;
    let failed = 0;

    for (const pol of politicians) {
      try {
        const awExtId = `aw-${pol.id}`;
        const existing = await prisma.politicians.findUnique({
          where: { externalId: awExtId },
          select: { id: true },
        });

        if (!existing) {
          await withRetry(() =>
            prisma.politicians.create({
              data: {
                id: awExtId,
                externalId: awExtId,
                source: "abgeordnetenwatch",
                firstName: pol.firstName || "",
                lastName: pol.lastName || "",
                fullName: `${pol.firstName || ""} ${pol.lastName || ""}`.trim(),
                party: pol.party?.label || pol.party?.name || null,
                gender: pol.sex || null,
                birthDate: pol.birthDate ? new Date(pol.birthDate) : null,
                rawData: JSON.stringify(pol),
              },
            })
          );
        }
        processed++;
      } catch {
        failed++;
      }
    }

    return { total: politicians.length, processed, failed };
  });
}

// ── Phase 3: Plenarprotokolle Speeches ────────────────────────────────────────

/**
 * Determine which sittings to fetch in this run.
 * Reads the highest sitting number already in the DB and fetches the next
 * SITTINGS_PER_RUN after it. Falls back to the most recent sittings if no
 * existing speeches are found.
 *
 * @param {number} session - Wahlperiode
 * @returns {Promise<number[]>} - list of sitting numbers to fetch
 */
async function determineSittingsToSync(session) {
  // Find the last synced sitting for this session
  const lastSpeech = await prisma.politician_speech
    .findFirst({
      where: { session },
      orderBy: { sitting: "desc" },
      select: { sitting: true },
    })
    .catch(() => null);

  const lastSitting = lastSpeech?.sitting ?? 0;

  // Fetch the sitting index from Bundestag to discover available sittings
  const index = await plenar.fetchSessionIndex(session).catch(() => []);

  if (index.length > 0) {
    // Sort ascending and take the next SITTINGS_PER_RUN after lastSitting
    const available = index
      .map((s) => s.sitting)
      .filter((n) => n > lastSitting)
      .sort((a, b) => a - b)
      .slice(0, SITTINGS_PER_RUN);
    if (available.length > 0) return available;
  }

  // Fallback: try a sliding window of sitting numbers around the last known one
  const base = lastSitting > 0 ? lastSitting + 1 : 180; // WP20 starts around sitting 1
  return Array.from({ length: SITTINGS_PER_RUN }, (_, i) => base + i);
}

/**
 * Build a Map of "nachname, vorname" -> {id, party} for fast speaker matching.
 * @returns {Promise<Map<string, {id: string, party: string}>>}
 */
async function buildSpeakerNameMap() {
  const politicians = await prisma.politicians
    .findMany({ select: { id: true, firstName: true, lastName: true, party: true } })
    .catch(() => []);

  const map = new Map();
  for (const p of politicians) {
    const key = `${(p.lastName || "").toLowerCase()}, ${(p.firstName || "").toLowerCase()}`;
    map.set(key, { id: p.id, party: p.party });
  }
  return map;
}

async function syncBundestagSpeeches() {
  return withSyncLog("plenar-speeches", async () => {
    const sittings = await determineSittingsToSync(CURRENT_WAHLPERIODE);
    const nameMap = await buildSpeakerNameMap();

    let total = 0;
    let processed = 0;
    let failed = 0;

    for (const sitting of sittings) {
      try {
        const speeches = await plenar.fetchProtocol(CURRENT_WAHLPERIODE, sitting);
        total += speeches.length;

        for (const speech of speeches) {
          try {
            const { politicianId, confidence } = plenar.matchSpeaker(speech, nameMap);

            // Only persist speeches where we can identify the speaker with reasonable confidence
            if (confidence < 0.5) continue;

            // Unique key: session + sitting + speaker name + first 100 chars of text
            const dedupeKey = `${speech.session}-${speech.sitting}-${speech.speakerName}-${speech.text.slice(0, 100)}`;

            await withRetry(() =>
              prisma.politician_speech.upsert({
                where: { dedupeKey },
                update: {
                  text: speech.text,
                  top: speech.top,
                  date: speech.date ? new Date(speech.date) : null,
                  documentUrl: speech.documentUrl,
                  speakerParty: speech.speakerParty,
                  matchConfidence: confidence,
                  updatedAt: new Date(),
                },
                create: {
                  dedupeKey,
                  politicianId,
                  speakerName: speech.speakerName,
                  speakerParty: speech.speakerParty,
                  text: speech.text,
                  top: speech.top,
                  date: speech.date ? new Date(speech.date) : null,
                  session: speech.session,
                  sitting: speech.sitting,
                  pageNumbers: speech.pageNumbers,
                  documentUrl: speech.documentUrl,
                  matchConfidence: confidence,
                },
              })
            );
            processed++;
          } catch {
            failed++;
          }
        }
      } catch (err) {
        // One failed sitting must not abort remaining ones
        failed++;
        console.error(`[sync-politician-data] Sitting ${sitting} failed: ${err.message}`);
      }
    }

    return { total, processed, failed };
  });
}

// ── Entrypoint ────────────────────────────────────────────────────────────────

async function main() {
  const results = {};

  // Run all three phases independently — a failure in one does not block others.
  try {
    results.members = await syncBundestagMembers();
  } catch (err) {
    results.members = { status: "failed", error: err.message };
  }

  try {
    results.abgeordnetenwatch = await syncAbgeordnetenwatch();
  } catch (err) {
    results.abgeordnetenwatch = { status: "failed", error: err.message };
  }

  try {
    results.speeches = await syncBundestagSpeeches();
  } catch (err) {
    results.speeches = { status: "failed", error: err.message };
  }

  const overallStatus = Object.values(results).some((r) => r.status === "failed")
    ? "partial"
    : "completed";

  if (typeof process.send === "function") {
    process.send({ silent: true, politicianSync: { status: overallStatus, ...results } });
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("[sync-politician-data] Fatal error:", err.message);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
