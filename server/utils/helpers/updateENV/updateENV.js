// SPDX-License-Identifier: MIT
// Purpose: Core updateENV function — validates and applies ENV variable changes.
// Docs: server/utils/helpers/updateENV.doc.md
const { KEY_MAPPING } = require("./keyMapping");
const { dumpENV } = require("./dumpENV");
const { SettingsManager } = require("../../SettingsManager");

// This will force update .env variables which for any which reason were not able to be parsed or
// read from an ENV file as this seems to be a complicating step for many so allowing people to write
// to the process will at least alleviate that issue. It does not perform comprehensive validity checks or sanity checks
// and is simply for debugging when the .env not found issue many come across.
async function updateENV(newENVs = {}, force = false, userId = null) {
  let error = "";
  const runAfterAll = [];
  const validKeys = Object.keys(KEY_MAPPING);
  const ENV_KEYS = Object.keys(newENVs).filter((key) => {
    if (!validKeys.includes(key)) return false;
    const value = newENVs[key];
    if (value === null || value === undefined) return true;
    return !String(value).includes("******"); // strip out answers where the value is all asterisks
  });
  const newValues = {};
  const managedEnvUpdates = {}; // envKey -> value, persisted to DB after apply

  for (const key of ENV_KEYS) {
    const {
      envKey,
      checks,
      preUpdate = [], // Functions to run before updating a specific ENV variable
      postUpdate = [], // Functions to run after updating a specific ENV variable
      postSettled = [], // Functions to run after all ENV variables have been updated
    } = KEY_MAPPING[key];
    runAfterAll.push(...postSettled);
    const prevValue = process.env[envKey];
    const nextValue = newENVs[key];
    let errors = await executeValidationChecks(checks, nextValue, force);

    // If there are any errors from regular simple validation checks
    // exit early.
    if (errors.length > 0) {
      error += errors.join("\n");
      break;
    }

    // Accumulate errors from preUpdate functions
    errors = [];
    for (const preUpdateFunc of preUpdate) {
      const errorMsg = await preUpdateFunc(key, prevValue, nextValue);
      if (!!errorMsg && typeof errorMsg === "string") errors.push(errorMsg);
    }

    // If there are any errors from preUpdate functions
    // exit early.
    if (errors.length > 0) {
      error += errors.join("\n");
      break;
    }

    newValues[key] = nextValue;
    // Runtime read cache — the rest of the app reads process.env directly.
    process.env[envKey] = nextValue;
    // Track the env key so we can persist it to the DB (source of truth) below.
    managedEnvUpdates[envKey] = nextValue;

    for (const postUpdateFunc of postUpdate)
      await postUpdateFunc(key, prevValue, nextValue);
  }

  for (const runAfterAllFunc of runAfterAll)
    await runAfterAllFunc(newValues, userId);

  await logChangesToEventLog(newValues, userId);

  // Phase 4: persist managed settings to the DB (encrypted at rest for
  // sensitive keys) with an audit trail — instead of dumping them to .env.
  try {
    await SettingsManager.persist(managedEnvUpdates, { userId });
  } catch (e) {
    console.error(`[updateENV] Failed to persist settings to DB: ${e.message}`);
  }

  // Bootstrap/infra secrets (SIG_KEY, JWT_SECRET, etc.) still live in .env.
  if (process.env.NODE_ENV === "production") dumpENV();
  return { newValues, error: error?.length > 0 ? error : false };
}

async function executeValidationChecks(checks, value, force) {
  const results = await Promise.all(
    checks.map((validator) => validator(value, force)),
  );
  return results.filter((err) => typeof err === "string");
}

async function logChangesToEventLog(newValues = {}, userId = null) {
  const { EventLogs } = require("../../../models/eventLogs");
  const eventMapping = {
    LLMProvider: "update_llm_provider",
    EmbeddingEngine: "update_embedding_engine",
    VectorDB: "update_vector_db",
  };

  for (const [key, eventName] of Object.entries(eventMapping)) {
    if (!newValues.hasOwnProperty(key)) continue;
    await EventLogs.logEvent(eventName, {}, userId);
  }
  return;
}

module.exports = { updateENV, executeValidationChecks, logChangesToEventLog };
