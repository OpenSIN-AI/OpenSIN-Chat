// SPDX-License-Identifier: MIT
// Purpose: Field validation functions for SystemSettings updates.
// Extracted from systemSettings.js as part of issue #510 God-File split.

const consoleLogger = require("../../utils/logger/console.js");
const { isValidUrl, safeJsonParse } = require("../../utils/http");
const { MetaGenerator } = require("../../utils/boot/MetaGenerator");
const {
  isNullOrNaN,
  mergeStringField,
  mergeConnections,
} = require("./helpers");
const { saneDefaultSystemPrompt } = require("./constants");

/**
 * Creates the validations object bound to a SystemSettings instance.
 * Some validators call SystemSettings.get() or SystemSettings.memoriesEnabled()
 * to read current state, so they need a reference to the full object.
 *
 * @param {Object} systemSettings - The SystemSettings object (for self-referencing calls)
 * @returns {Object} The validations map
 */
function createValidations(systemSettings) {
  return {
    footer_data: (updates) => {
      try {
        const array = JSON.parse(updates)
          .filter((setting) => isValidUrl(setting.url))
          .slice(0, 3); // max of 3 items in footer.
        return JSON.stringify(array);
      } catch {
        consoleLogger.error(`Failed to run validation function on footer_data`);
        return JSON.stringify([]);
      }
    },
    text_splitter_chunk_size: async (update) => {
      try {
        if (isNullOrNaN(update)) throw new Error("Value is not a number.");
        if (Number(update) <= 0) throw new Error("Value must be non-zero.");
        const { purgeEntireVectorCache } = require("../../utils/files");
        await purgeEntireVectorCache();
        return Number(update);
      } catch (e) {
        consoleLogger.error(
          `Failed to run validation function on text_splitter_chunk_size`,
          e.message,
        );
        return 1000;
      }
    },
    text_splitter_chunk_overlap: async (update) => {
      try {
        if (isNullOrNaN(update)) throw new Error("Value is not a number");
        if (Number(update) < 0) throw new Error("Value cannot be less than 0.");
        const { purgeEntireVectorCache } = require("../../utils/files");
        await purgeEntireVectorCache();
        return Number(update);
      } catch (e) {
        consoleLogger.error(
          `Failed to run validation function on text_splitter_chunk_overlap`,
          e.message,
        );
        return 20;
      }
    },
    agent_search_provider: (update) => {
      try {
        if (update === "none") return null;
        if (
          ![
            "google-search-engine",
            "serpapi",
            "searchapi",
            "serper-dot-dev",
            "bing-search",
            "baidu-search",
            "serply-engine",
            "searxng-engine",
            "tavily-search",
            "duckduckgo-engine",
            "exa-search",
            "perplexity-search",
            "vane",
          ].includes(update)
        )
          throw new Error("Invalid SERP provider.");
        return String(update);
      } catch (e) {
        consoleLogger.error(
          `Failed to run validation function on agent_search_provider`,
          e.message,
        );
        return null;
      }
    },
    default_agent_skills: (updates) => {
      try {
        const skills = updates.split(",").filter((skill) => !!skill);
        return JSON.stringify(skills);
      } catch {
        consoleLogger.error(`Could not validate agent skills.`);
        return JSON.stringify([]);
      }
    },
    memory_enabled: async (update) => {
      try {
        const enabled = String(update) === "true";
        const {
          BackgroundService,
        } = require("../../utils/BackgroundWorkers/index.js");
        const bgService = new BackgroundService();
        const autoSetting = await systemSettings.get({
          label: "memory_auto_extraction",
        });
        const autoOn = !autoSetting || autoSetting.value === "true";
        await bgService.syncMemoryJob(enabled && autoOn);
        return String(enabled);
      } catch (e) {
        consoleLogger.error(
          `Failed to run validation function on memory_enabled`,
          e.message,
        );
        return String(update);
      }
    },
    memory_auto_extraction: async (update) => {
      try {
        const enabled = String(update) === "true";
        const {
          BackgroundService,
        } = require("../../utils/BackgroundWorkers/index.js");
        const bgService = new BackgroundService();
        const memoriesOn = await systemSettings.memoriesEnabled();
        await bgService.syncMemoryJob(memoriesOn && enabled);
        return String(enabled);
      } catch (e) {
        consoleLogger.error(
          `Failed to run validation function on memory_auto_extraction`,
          e.message,
        );
        return String(update);
      }
    },
    disabled_agent_skills: (updates) => {
      try {
        const skills = updates.split(",").filter((skill) => !!skill);
        return JSON.stringify(skills);
      } catch {
        consoleLogger.error(`Could not validate disabled agent skills.`);
        return JSON.stringify([]);
      }
    },
    disabled_filesystem_skills: (updates) => {
      try {
        const skills = updates.split(",").filter((skill) => !!skill);
        return JSON.stringify(skills);
      } catch {
        consoleLogger.error(`Could not validate disabled filesystem skills.`);
        return JSON.stringify([]);
      }
    },
    disabled_create_files_skills: (updates) => {
      try {
        const skills = updates.split(",").filter((skill) => !!skill);
        return JSON.stringify(skills);
      } catch {
        consoleLogger.error(`Could not validate disabled create files skills.`);
        return JSON.stringify([]);
      }
    },
    disabled_gmail_skills: (updates) => {
      try {
        const skills = updates.split(",").filter((skill) => !!skill);
        return JSON.stringify(skills);
      } catch {
        consoleLogger.error(`Could not validate disabled gmail skills.`);
        return JSON.stringify([]);
      }
    },
    gmail_agent_config: async (update) => {
      const GmailBridge = require("../../utils/agents/aibitat/plugins/gmail/lib");
      try {
        if (!update) return JSON.stringify({});

        const newConfig =
          typeof update === "string" ? safeJsonParse(update, {}) : update;
        const existingConfig = safeJsonParse(
          (await systemSettings.get({ label: "gmail_agent_config" }))?.value,
          {},
        );

        const mergedConfig = { ...existingConfig };

        mergeStringField(mergedConfig, newConfig, "deploymentId");
        mergeStringField(
          mergedConfig,
          newConfig,
          "apiKey",
          (v) => !v.match(/^\*+$/),
        );

        // Multi-account E-Mail Center configuration. Preserve existing secrets
        // for partial account updates and never accept masked placeholder keys.
        if (Array.isArray(newConfig.accounts)) {
          const existingAccounts = Array.isArray(existingConfig.accounts)
            ? existingConfig.accounts
            : [];
          const existingById = new Map(
            existingAccounts.map((account) => [String(account.id), account]),
          );
          mergedConfig.accounts = newConfig.accounts
            .filter((account) => account && typeof account === "object")
            .map((account) => {
              const previous = existingById.get(String(account.id)) || {};
              const incomingKey = String(account.apiKey || "");
              return {
                ...previous,
                ...account,
                apiKey:
                  incomingKey && !/^\*+$/.test(incomingKey)
                    ? incomingKey
                    : previous.apiKey || "",
              };
            });
        } else if (
          Array.isArray(existingConfig.accounts) &&
          existingConfig.accounts.length > 0 &&
          (newConfig.deploymentId !== undefined || newConfig.apiKey !== undefined)
        ) {
          // Keep the legacy single-account settings panel useful after the
          // config has been migrated: its two fields edit the default account.
          const defaultId =
            existingConfig.defaultAccountId || existingConfig.accounts[0].id;
          mergedConfig.accounts = existingConfig.accounts.map((account) => {
            if (String(account.id) !== String(defaultId)) return account;
            const incomingKey = String(newConfig.apiKey || "");
            return {
              ...account,
              deploymentId:
                newConfig.deploymentId !== undefined
                  ? String(newConfig.deploymentId || "")
                  : account.deploymentId,
              apiKey:
                incomingKey && !/^\*+$/.test(incomingKey)
                  ? incomingKey
                  : account.apiKey || "",
            };
          });
        }
        if (Array.isArray(newConfig.groups)) {
          mergedConfig.groups = newConfig.groups;
        }
        if (newConfig.defaultAccountId !== undefined) {
          mergedConfig.defaultAccountId = String(newConfig.defaultAccountId || "");
        }

        return JSON.stringify(mergedConfig);
      } catch (e) {
        consoleLogger.error(
          `Could not validate gmail agent config:`,
          e.message,
        );
        return JSON.stringify({});
      } finally {
        GmailBridge.reset();
      }
    },
    disabled_google_calendar_skills: (updates) => {
      try {
        const skills = updates.split(",").filter((skill) => !!skill);
        return JSON.stringify(skills);
      } catch {
        consoleLogger.error(
          `Could not validate disabled google calendar skills.`,
        );
        return JSON.stringify([]);
      }
    },
    google_calendar_agent_config: async (update) => {
      const GoogleCalendarBridge = require("../../utils/agents/aibitat/plugins/google-calendar/lib");
      try {
        if (!update) return JSON.stringify({});

        const newConfig =
          typeof update === "string" ? safeJsonParse(update, {}) : update;
        const existingConfig = safeJsonParse(
          (await systemSettings.get({ label: "google_calendar_agent_config" }))
            ?.value,
          {},
        );

        const mergedConfig = { ...existingConfig };

        mergeStringField(mergedConfig, newConfig, "deploymentId");
        mergeStringField(
          mergedConfig,
          newConfig,
          "apiKey",
          (v) => !v.match(/^\*+$/),
        );

        return JSON.stringify(mergedConfig);
      } catch (e) {
        consoleLogger.error(
          `Could not validate google calendar agent config:`,
          e.message,
        );
        return JSON.stringify({});
      } finally {
        GoogleCalendarBridge.reset();
      }
    },
    disabled_outlook_skills: (updates) => {
      try {
        const skills = updates.split(",").filter((skill) => !!skill);
        return JSON.stringify(skills);
      } catch {
        consoleLogger.error(`Could not validate disabled outlook skills.`);
        return JSON.stringify([]);
      }
    },
    outlook_agent_config: async (update) => {
      const OutlookBridge = require("../../utils/agents/aibitat/plugins/outlook/lib");
      try {
        if (!update) return JSON.stringify({});

        const newConfig =
          typeof update === "string" ? safeJsonParse(update, {}) : update;
        const existingConfig = safeJsonParse(
          (await systemSettings.get({ label: "outlook_agent_config" }))?.value,
          {},
        );

        const mergedConfig = { ...existingConfig };

        mergeStringField(mergedConfig, newConfig, "clientId");
        mergeStringField(mergedConfig, newConfig, "tenantId");
        mergeStringField(
          mergedConfig,
          newConfig,
          "clientSecret",
          (v) => !v.match(/^\*+$/),
        );

        if (newConfig.accessToken !== undefined) {
          mergedConfig.accessToken = newConfig.accessToken;
        }
        if (newConfig.refreshToken !== undefined) {
          mergedConfig.refreshToken = newConfig.refreshToken;
        }
        if (newConfig.tokenExpiry !== undefined) {
          mergedConfig.tokenExpiry = newConfig.tokenExpiry;
        }

        return JSON.stringify(mergedConfig);
      } catch (e) {
        consoleLogger.error(
          `Could not validate outlook agent config:`,
          e.message,
        );
        return JSON.stringify({});
      } finally {
        OutlookBridge.reset();
      }
    },
    agent_sql_connections: async (updates) => {
      const existingConnections = safeJsonParse(
        (await systemSettings.get({ label: "agent_sql_connections" }))?.value,
        [],
      );
      try {
        const updatedConnections = mergeConnections(
          existingConnections,
          safeJsonParse(updates, []),
        );
        return JSON.stringify(updatedConnections);
      } catch {
        consoleLogger.error(`Failed to merge connections`);
        return JSON.stringify(existingConnections ?? []);
      }
    },
    agent_clarifying_questions_enabled: (update) => {
      if (typeof update === "boolean") return update ? "true" : "false";
      return String(update) === "true" ? "true" : "false";
    },
    agent_clarifying_questions_max_per_turn: (update) => {
      const n = Number(update);
      if (!Number.isFinite(n) || n < 1) return 3;
      return Math.min(Math.floor(n), 10);
    },
    experimental_live_file_sync: (update) => {
      if (typeof update === "boolean")
        return update === true ? "enabled" : "disabled";
      if (!["enabled", "disabled"].includes(update)) return "disabled";
      return String(update);
    },
    meta_page_title: (newTitle) => {
      try {
        if (typeof newTitle !== "string" || !newTitle) return null;
        return String(newTitle);
      } catch {
        return null;
      } finally {
        new MetaGenerator().clearConfig();
      }
    },
    meta_page_favicon: (faviconUrl) => {
      if (!faviconUrl) return null;
      try {
        const url = new URL(faviconUrl);
        return url.toString();
      } catch {
        return null;
      } finally {
        new MetaGenerator().clearConfig();
      }
    },
    hub_api_key: (apiKey) => {
      if (!apiKey) return null;
      return String(apiKey);
    },
    default_system_prompt: (prompt) => {
      if (typeof prompt !== "string" || !prompt) return null;
      if (prompt.trim() === saneDefaultSystemPrompt)
        return saneDefaultSystemPrompt;
      return String(prompt.trim());
    },
    image_generation_base_path: (update) => {
      try {
        if (!update || typeof update !== "string") return undefined;
        const url = new URL(update);
        if (!/^https?:$/i.test(url.protocol)) return undefined;
        return url.origin + url.pathname.replace(/\/+$/, "");
      } catch {
        return undefined;
      }
    },
    image_generation_api_key: async (update) => {
      if (!update || typeof update !== "string") return undefined;
      if (/^-CLEAR-$/.test(update)) {
        return null;
      }
      if (/^\*+$/.test(update)) {
        const existing = await systemSettings.get({
          label: "image_generation_api_key",
        });
        return existing?.value ?? null;
      }
      return String(update).trim();
    },
    image_generation_model: (update) => {
      if (!update || typeof update !== "string") return undefined;
      return String(update).trim();
    },
  };
}

module.exports = { createValidations };
