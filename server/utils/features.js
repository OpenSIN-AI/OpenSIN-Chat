// SPDX-License-Identifier: MIT
"use strict";

const FEATURE_ENVIRONMENT_KEYS = Object.freeze({
  imageGeneration: "ENABLE_IMAGE_GENERATION",
  videoGeneration: "ENABLE_VIDEO_GENERATION",
  cvoiceTts: "ENABLE_CVOICE_TTS",
});

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);
const FALSE_VALUES = new Set(["0", "false", "no", "off", ""]);

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "boolean") return value;

  const normalized = String(value).trim().toLowerCase();

  if (TRUE_VALUES.has(normalized)) return true;
  if (FALSE_VALUES.has(normalized)) return false;

  return fallback;
}

function isFeatureEnabled(featureName, env = process.env) {
  const environmentKey = FEATURE_ENVIRONMENT_KEYS[featureName];

  if (!environmentKey) {
    throw new Error(`Unknown feature flag: ${featureName}`);
  }

  return parseBoolean(env[environmentKey], false);
}

function featureSnapshot(env = process.env) {
  return Object.fromEntries(
    Object.keys(FEATURE_ENVIRONMENT_KEYS).map((featureName) => [
      featureName,
      isFeatureEnabled(featureName, env),
    ]),
  );
}

module.exports = {
  FEATURE_ENVIRONMENT_KEYS,
  featureSnapshot,
  isFeatureEnabled,
  parseBoolean,
};
