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
const {
  SYNC_PHASES,
  MAX_RETRIES,
  shouldRetry,
  nextRetryAt,
  withFallback,
} = require("../utils/politician/syncFallback");

const prisma = new PrismaClient();
const bundestag = new BundestagApi();
const abgeordnetenwatch = new AbgeordnetenwatchApi();
const plenar = new PlenarScraper();

// ── Configuration ─────────────────────────────────────────────────────────────

/** Current Bundestag electoral term (Wahlperiode). 21. WP since 2021 (#84). */
const CURRENT_WAHLPERIODE = parseInt(
  process.env.BUNDESTAG_WAHLPERIODE || "21",
  10
);

/**
 * When enabled, the Abgeordnetenwatch client enriches each politician with the
 * verified 21. WP entity fields (`year_of_birth`, `gender`, `party`,
 * `ext_id_bundestagsverwaltung`). This costs one extra request per politician
 * (~733), so it is opt-in to keep the scheduled run within the Bree timeout.
 * @type {boolean}
 */
const AW_ENRICH_POLITICIANS =
  String(process.env.AW_ENRICH_POLITICIANS || "false").toLowerCase() === "true";

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

// ── Retry queue (Issue #52) ───────────────────────────────────────────────────
//
// Failed phases are persisted in `politician_sync_retry` with an exponential
// back-off `nextRetryAt`. Every DB access is wrapped defensively so a missing
// table (e.g. before the migration is applied / client regenerated) degrades
// gracefully and never aborts the main sync.

/**
 * Whether the retry-queue model is available on the Prisma client.
 * @returns {boolean}
 */
function retryQueueAvailable() {
  return !!prisma.politician_sync_retry;
}

/**
 * Load retry entries that are currently due (pending and nextRetryAt <= now).
 * @returns {Promise<Set<string>>} set of phase keys that are due
 */
async function loadDueRetryPhases() {
  if (!retryQueueAvailable()) return new Set();
  try {
    const due = await prisma.politician_sync_retry.findMany({
      where: { status: "pending", nextRetryAt: { lte: new Date() } },
      select: { phase: true },
    });
    return new Set(due.map((r) => r.phase));
  } catch (err) {
    console.warn(`[sync-politician-data] loadDueRetryPhases failed: ${err.message}`);
    return new Set();
  }
}

/**
 * Record a failed phase in the retry queue, incrementing its attempt counter
 * and scheduling the next attempt with exponential back-off. Once MAX_RETRIES
 * is reached the entry is marked "exhausted".
 * @param {string} phase
 * @param {string} errorMessage
 */
async function enqueueRetry(phase, errorMessage) {
  if (!retryQueueAvailable()) return;
  try {
    const existing = await prisma.politician_sync_retry.findUnique({
      where: { phase },
    });
    const attempts = (existing?.attempts ?? 0) + 1;
    const willRetry = shouldRetry(attempts);
    const data = {
      attempts,
      lastError: (errorMessage || "").slice(0, 500),
      status: willRetry ? "pending" : "exhausted",
      nextRetryAt: willRetry ? nextRetryAt(attempts) : new Date(),
    };
    await prisma.politician_sync_retry.upsert({
      where: { phase },
      update: data,
      create: { phase, ...data },
    });
    console.warn(
      `[sync-politician-data] phase '${phase}' enqueued for retry ` +
        `(attempt ${attempts}/${MAX_RETRIES}, ${willRetry ? "will retry" : "exhausted"})`,
    );
  } catch (err) {
    console.warn(`[sync-politician-data] enqueueRetry failed: ${err.message}`);
  }
}

/**
 * Mark a phase as successfully resolved, clearing any pending retry.
 * @param {string} phase
 */
async function resolveRetry(phase) {
  if (!retryQueueAvailable()) return;
  try {
    await prisma.politician_sync_retry.updateMany({
      where: { phase, status: { not: "resolved" } },
      data: { status: "resolved", attempts: 0, lastError: null },
    });
  } catch (err) {
    console.warn(`[sync-politician-data] resolveRetry failed: ${err.message}`);
  }
}

/**
 * Read a party/faction label from either the new flat AW shape (`party` is a
 * string) or the legacy nested shape (`party.label` / `party.name`).
 * @param {Object} pol
 * @returns {string|null}
 */
function awParty(pol) {
  if (typeof pol.party === "string") return pol.party || null;
  return pol.party?.label || pol.party?.name || null;
}

/**
 * Normalize an Abgeordnetenwatch politician (21. WP candidacies-mandates shape)
 * into the Bundestag-member upsert shape so it can be used as a cross-source
 * fallback for Phase 1. Carries the verified new fields (`first_name`,
 * `last_name`, `year_of_birth`, `ext_id_bundestagsverwaltung`).
 * @param {Object} pol
 * @returns {Object}
 */
function normalizeAwToMember(pol) {
  const externalId = pol.externalId || `aw-${pol.id}`;
  const firstName = pol.first_name || pol.firstName || "";
  const lastName = pol.last_name || pol.lastName || "";
  const party = awParty(pol);
  return {
    id: externalId,
    externalId,
    source: "abgeordnetenwatch",
    title: null,
    firstName,
    lastName,
    fullName: pol.fullName || `${firstName} ${lastName}`.trim(),
    party,
    faction: pol.faction || party,
    gender: pol.gender || pol.sex || null,
    birthDate: pol.birthDate || null,
    birthPlace: null,
    profession: null,
    education: null,
    photoUrl: null,
    profileUrl: pol.politicianApiUrl || pol.abgeordnetenwatch_url || null,
    email: null,
    electoralDistrict: pol.constituency || null,
    electoralList: null,
    state: null,
    bio: null,
    websiteUrl: null,
    rawData: JSON.stringify(pol),
  };
}

// ── Phase 1: Bundestag Members ────────────────────────────────────────────────

async function syncBundestagMembers() {
  return withSyncLog("bundestag", async () => {
    // Cross-source fallback: if the Bundestag API is down or empty, fall back
    // to Abgeordnetenwatch base data so member records can still be refreshed.
    const { data, usedFallback, error } = await withFallback(
      () => bundestag.fetchAllMembers(),
      async () => {
        const pols = await abgeordnetenwatch.fetchAllPoliticians({
          enrich: AW_ENRICH_POLITICIANS,
        });
        return pols.map(normalizeAwToMember);
      },
      { label: "bundestag-members" },
    );
    if (error) throw error;
    const members = data || [];
    if (usedFallback)
      console.warn(
        "[sync-politician-data] Phase 1 used Abgeordnetenwatch fallback for member data",
      );
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
              source: member.source || "bundestag",
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
    // Cross-source fallback: if Abgeordnetenwatch is down or empty, derive the
    // base records from the Bundestag member list instead.
    const { data, usedFallback, error } = await withFallback(
      () => abgeordnetenwatch.fetchAllPoliticians({ enrich: AW_ENRICH_POLITICIANS }),
      async () => {
        const members = await bundestag.fetchAllMembers();
        // Shape Bundestag members like AW politicians for the upsert below.
        return members.map((m) => ({
          id: m.externalId || m.id,
          externalId: m.externalId || m.id,
          firstName: m.firstName,
          lastName: m.lastName,
          party: m.party,
          gender: m.gender,
          birthDate: m.birthDate,
          __fromBundestag: true,
        }));
      },
      { label: "abgeordnetenwatch-politicians" },
    );
    if (error) throw error;
    const politicians = data || [];
    if (usedFallback)
      console.warn(
        "[sync-politician-data] Phase 2 used Bundestag fallback for AW data",
      );
    let processed = 0;
    let failed = 0;

    for (const pol of politicians) {
      try {
        // Fallback records originate from Bundestag and must keep their own
        // id namespace + source so they are not mistaken for AW profiles.
        const extId = pol.__fromBundestag
          ? String(pol.id)
          : pol.externalId || `aw-${pol.id}`;
        const recordSource = pol.__fromBundestag
          ? "bundestag"
          : "abgeordnetenwatch";
        const firstName = pol.first_name || pol.firstName || "";
        const lastName = pol.last_name || pol.lastName || "";
        // year_of_birth (21. WP) → birthDate; fall back to a raw birthDate.
        const birthDate = pol.birthDate
          ? new Date(pol.birthDate)
          : pol.year_of_birth
            ? new Date(`${pol.year_of_birth}-01-01`)
            : null;
        const existing = await prisma.politicians.findUnique({
          where: { externalId: extId },
          select: { id: true },
        });

        if (!existing) {
          await withRetry(() =>
            prisma.politicians.create({
              data: {
                id: extId,
                externalId: extId,
                source: recordSource,
                firstName,
                lastName,
                fullName: `${firstName} ${lastName}`.trim(),
                party: awParty(pol),
                gender: pol.gender || pol.sex || null,
                birthDate,
                electoralDistrict: pol.constituency || null,
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

/**
 * Run a single phase, updating the retry queue based on the outcome:
 *   - success  -> clear any pending retry for the phase
 *   - failure  -> enqueue / increment the retry with exponential back-off
 * A failure never propagates so the remaining phases keep running.
 * @param {string} phase - one of SYNC_PHASES
 * @param {() => Promise<object>} fn
 * @returns {Promise<object>} the phase result (or a failure marker)
 */
async function runPhase(phase, fn) {
  try {
    const result = await fn();
    await resolveRetry(phase);
    return result;
  } catch (err) {
    await enqueueRetry(phase, err.message);
    return { status: "failed", error: err.message };
  }
}

async function main() {
  const results = {};

  // Surface which phases are due for a retry (informational — phases always run
  // on the scheduled cadence, the queue tracks back-off state and exhaustion).
  const duePhases = await loadDueRetryPhases();
  if (duePhases.size > 0)
    console.warn(
      `[sync-politician-data] retrying due phases: ${[...duePhases].join(", ")}`,
    );

  // Run all three phases independently — a failure in one does not block others
  // and each updates the retry queue via runPhase.
  results.members = await runPhase(SYNC_PHASES.members, syncBundestagMembers);
  results.abgeordnetenwatch = await runPhase(
    SYNC_PHASES.abgeordnetenwatch,
    syncAbgeordnetenwatch,
  );
  results.speeches = await runPhase(SYNC_PHASES.speeches, syncBundestagSpeeches);

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
