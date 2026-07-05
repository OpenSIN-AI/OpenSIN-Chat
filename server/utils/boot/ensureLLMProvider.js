// SPDX-License-Identifier: MIT
const consoleLogger = require("../logger/console.js");

const DEFAULT_PROVIDER = "nvidia-nim";
const DEFAULT_MODEL = "nvidia/nemotron-nano-12b-v2-vl";
const DEFAULT_API_KEY = process.env.NVIDIA_NIM_LLM_API_KEY || "";
const DEFAULT_BASE_PATH = process.env.NVIDIA_NIM_LLM_BASE_PATH || "https://integrate.api.nvidia.com/v1";

const BROKEN_PROVIDERS = ["generic-openai", "openai", "azure"];

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
        `\x1b[33m[LLM BOOT]\x1b[0m No LLM provider in DB — seeding default: ${DEFAULT_PROVIDER}`,
      );

      await SystemSettings._updateSettings({
        llm_provider: DEFAULT_PROVIDER,
        llm_model_pref: DEFAULT_MODEL,
        llm_api_key: DEFAULT_API_KEY,
        llm_base_path: DEFAULT_BASE_PATH,
      });

      consoleLogger.log(
        `\x1b[32m[LLM BOOT]\x1b[0m Seeded ${DEFAULT_PROVIDER} / ${DEFAULT_MODEL}`,
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
          await Workspace.update({ where: { id: ws.id }, data: { chatProvider: DEFAULT_PROVIDER, chatModel: DEFAULT_MODEL } });
        }
        consoleLogger.log(
          `\x1b[32m[LLM BOOT]\x1b[0m Fixed workspace providers → ${DEFAULT_PROVIDER}`,
        );
      }
    }
  } catch (e) {
    consoleLogger.error(`\x1b[31m[LLM BOOT ERROR]\x1b[0m ${e.message}`);
  }
}

module.exports = ensureLLMProvider;
