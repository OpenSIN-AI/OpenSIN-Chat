// SPDX-License-Identifier: MIT
const consoleLogger = require("../logger/console.js");

const DEFAULT_LLM_PROVIDER = "fireworksai";
const DEFAULT_LLM_MODEL = "accounts/fireworks/models/minimax-m3";
const DEFAULT_LLM_API_KEY = process.env.FIREWORKS_AI_LLM_API_KEY || "";
const DEFAULT_LLM_BASE_PATH =
  process.env.FIREWORKS_AI_LLM_BASE_PATH ||
  "https://sinatorpool-router.delqhi.com/inference/v1";

const BROKEN_PROVIDERS = ["generic-openai", "nvidia-nim", "openai", "azure"];

async function ensureLLMProvider() {
  try {
    const { SystemSettings } = require("../../models/systemSettings");
    const { Workspace } = require("../../models/workspace");

    const existing = await SystemSettings.get({ label: "llm_provider" });

    if (existing?.value && existing.value !== "undefined") {
      consoleLogger.log(
        `\x1b[32m[LLM BOOT]\x1b[0m Provider already set: ${existing.value}`,
      );
    } else {
      consoleLogger.log(
        `\x1b[33m[LLM BOOT]\x1b[0m No LLM provider in DB — seeding default: ${DEFAULT_LLM_PROVIDER}`,
      );

      await SystemSettings._updateSettings({
        llm_provider: DEFAULT_LLM_PROVIDER,
        llm_model_pref: DEFAULT_LLM_MODEL,
        llm_api_key: DEFAULT_LLM_API_KEY,
        llm_base_path: DEFAULT_LLM_BASE_PATH,
      });

      consoleLogger.log(
        `\x1b[32m[LLM BOOT]\x1b[0m Seeded ${DEFAULT_LLM_PROVIDER} / ${DEFAULT_LLM_MODEL}`,
      );
    }

    if (typeof Workspace?.where === "function") {
      const broken = await Workspace.where({
        chatProvider: { in: BROKEN_PROVIDERS },
      });
      if (broken.length > 0) {
        consoleLogger.log(
          `\x1b[33m[LLM BOOT]\x1b[0m Fixing ${broken.length} workspace(s) with broken provider`,
        );
        for (const ws of broken) {
          await ws.update({ chatProvider: DEFAULT_LLM_PROVIDER });
        }
        consoleLogger.log(
          `\x1b[32m[LLM BOOT]\x1b[0m Fixed workspace providers → ${DEFAULT_LLM_PROVIDER}`,
        );
      }
    }
  } catch (e) {
    consoleLogger.error(`\x1b[31m[LLM BOOT ERROR]\x1b[0m ${e.message}`);
  }
}

module.exports = ensureLLMProvider;
