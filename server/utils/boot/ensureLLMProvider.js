// SPDX-License-Identifier: MIT
const consoleLogger = require("../logger/console.js");

const DEFAULT_LLM_PROVIDER = "fireworksAi";
const DEFAULT_LLM_MODEL = "accounts/fireworks/models/minimax-m3";
const DEFAULT_LLM_API_KEY = process.env.FIREWORKS_API_KEY || "";
const DEFAULT_LLM_BASE_PATH =
  process.env.FIREWORKS_LLM_BASE_PATH ||
  "https://sinatorpool-router.delqhi.com/inference/v1";

async function ensureLLMProvider() {
  try {
    const { SystemSettings } = require("../../models/systemSettings");
    const existing = await SystemSettings.get({ label: "llm_provider" });

    if (existing?.value && existing.value !== "undefined") {
      consoleLogger.log(
        `\x1b[32m[LLM BOOT]\x1b[0m Provider already set: ${existing.value}`,
      );
      return;
    }

    consoleLogger.log(
      `\x1b[33m[LLM BOOT]\x1b[0m No LLM provider in DB — seeding default: ${DEFAULT_LLM_PROVIDER}`,
    );

    await SystemSettings.save({
      label: "llm_provider",
      value: DEFAULT_LLM_PROVIDER,
    });
    await SystemSettings.save({
      label: "llm_model_pref",
      value: DEFAULT_LLM_MODEL,
    });
    if (DEFAULT_LLM_API_KEY) {
      await SystemSettings.save({
        label: "llm_api_key",
        value: DEFAULT_LLM_API_KEY,
      });
    }
    await SystemSettings.save({
      label: "llm_base_path",
      value: DEFAULT_LLM_BASE_PATH,
    });

    consoleLogger.log(
      `\x1b[32m[LLM BOOT]\x1b[0m Seeded ${DEFAULT_LLM_PROVIDER} / ${DEFAULT_LLM_MODEL}`,
    );
  } catch (e) {
    consoleLogger.error(`\x1b[31m[LLM BOOT ERROR]\x1b[0m ${e.message}`);
  }
}

module.exports = ensureLLMProvider;
