// SPDX-License-Identifier: MIT
import {
  API_BASE,
  AUTH_TIMESTAMP,
  THEME_KEY,
  fullApiUrl,
} from "@/utils/constants";
import { baseHeaders, safeJsonParse } from "@/utils/request";
import { safeGetItem, safeSetItem, safeRemoveItem } from "@/utils/safeStorage";
import { fetchWithTimeout } from "@/utils/fetchWithTimeout";
import DataConnector from "./dataConnector";
import LiveDocumentSync from "./experimental/liveSync";
import AgentPlugins from "./experimental/agentPlugins";
import SystemPromptVariable from "./systemPromptVariable";
import logger from "@/utils/logger";

/**
 * Dev-only: returns true when the onboarding gate should be bypassed.
 * Controlled by a localStorage flag or the VITE_DISABLE_ONBOARDING env var.
 * @returns {boolean}
 */
function isOnboardingBypassEnabled() {
  try {
    if (import.meta.env.VITE_DISABLE_ONBOARDING === "true") return true;
    return safeGetItem("opensin_disable_onboarding") === "true";
  } catch {
    return false;
  }
}

/**
 * Safely parse a fetch Response as JSON.
 * Throws an Error with HTTP status info when the response is not ok,
 * so callers' .catch() blocks receive a meaningful error instead of a
 * SyntaxError from trying to parse non-JSON error bodies.
 * @param {Response} res
 * @returns {Promise<any>}
 */
/** @param {Response} res
 * @returns {Promise<any>}
 */
async function safeJson(res) {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}

const System = {
  cacheKeys: {
    footerIcons: "opensin_footer_links",
    supportEmail: "opensin_support_email",
    customAppName: "opensin_custom_app_name",
    canViewChatHistory: "opensin_can_view_chat_history",
    deploymentVersion: "opensin_deployment_version",
  },
  /** @returns {Promise<{online: boolean, version: string}>} */
  ping: async function () {
    return await fetchWithTimeout(`${API_BASE}/ping`)
      .then((res) => safeJson(res))
      .then((res) => res?.online || false)
      .catch(() => false);
  },
  /** @param {string|null} [slug=null]
 * @returns {Promise<{vectorDimensions: number, vectorCount: number}>}
 */
  totalIndexes: async function (slug = null) {
    const url = new URL(`${fullApiUrl()}/system/system-vectors`);
    if (!!slug) url.searchParams.append("slug", encodeURIComponent(slug));
    return await fetchWithTimeout(url.toString(), {
      headers: baseHeaders(),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Could not find indexes.");
        return res.json();
      })
      .then((res) => res.vectorCount)
      .catch(() => 0);
  },

  /**
   * Checks if the onboarding is complete.
   *
   * Dev/audit bypass: when running a dev build you can skip the backend
   * onboarding gate (useful for visually auditing the app without a running
   * server). Enable it either by:
   *   - localStorage.setItem("opensin_disable_onboarding", "true")  // no rebuild
   *   - building with VITE_DISABLE_ONBOARDING=true
   * The bypass is ignored entirely in production builds.
   * @returns {Promise<boolean>}
   */
  /** @returns {Promise<boolean>} */
  isOnboardingComplete: async function () {
    // Onboarding is permanently disabled for this instance.
    // Always return true so the frontend never shows the onboarding flow.
    return true;
  },
  /**
   * Marks the onboarding as complete.
   * @returns {Promise<boolean>}
   */
  /** @returns {Promise<{success: boolean}>} */
  markOnboardingComplete: async function () {
    return await fetch(`${API_BASE}/onboarding`, {
      method: "POST",
      headers: baseHeaders(),
    })
      .then((res) => res.ok)
      .catch(() => false);
  },
  /** @returns {Promise<any>} */
  keys: async function () {
    return await fetchWithTimeout(`${API_BASE}/setup-complete`)
      .then((res) => {
        if (!res.ok) throw new Error("Could not find setup information.");
        return res.json();
      })
      .then((res) => res.results)
      .catch(() => null);
  },
  /** @returns {Promise<{localFiles: string[], message: string|null}>} */
  localFiles: async function () {
    return await fetchWithTimeout(`${API_BASE}/system/local-files`, {
      headers: baseHeaders(),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Could not find setup information.");
        return res.json();
      })
      .then((res) => res.localFiles)
      .catch(() => null);
  },
  /** @returns {boolean} */
  needsAuthCheck: function () {
    const lastAuthCheck = safeGetItem(AUTH_TIMESTAMP);
    if (!lastAuthCheck) return true;
    const expiresAtMs = Number(lastAuthCheck) + 60 * 5 * 1000; // expires in 5 minutes in ms
    return Number(new Date()) > expiresAtMs;
  },

  /** @param {string|null} [currentToken=null]
 * @returns {Promise<{authenticated: boolean, user: object|null}>}
 */
  checkAuth: async function (currentToken = null) {
    const valid = await fetchWithTimeout(`${API_BASE}/system/check-token`, {
      headers: baseHeaders(currentToken),
    })
      .then((res) => res.ok)
      .catch(() => false);

    if (valid) {
      safeSetItem(AUTH_TIMESTAMP, String(Number(new Date())));
    }
    return valid;
  },
  /** @param {{username: string, password: string}} body
 * @returns {Promise<{token: string|null, user: object|null, error: string|null}>}
 */
  requestToken: async function (body) {
    return await fetchWithTimeout(`${API_BASE}/request-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(data?.message || "Could not validate login.");
        }
        return data;
      })
      .then((res) => res)
      .catch((e) => {
        return { valid: false, message: e.message };
      });
  },
  /**
   * Refreshes the user object from the session.
   * @returns {Promise<{success: boolean, user: Object | null, message: string | null}>}
   */
  refreshUser: () => {
    return fetchWithTimeout(`${API_BASE}/system/refresh-user`, {
      headers: baseHeaders(),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Could not refresh user.");
        return res.json();
      })
      .catch((e) => {
        return { success: false, user: null, message: e.message };
      });
  },
  /** @param {string} username
 * @param {string} recoveryCodes
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
  recoverAccount: async function (username, recoveryCodes) {
    return await fetchWithTimeout(`${API_BASE}/system/recover-account`, {
      method: "POST",
      headers: { ...baseHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ username, recoveryCodes }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || "Error recovering account.");
        }
        return data;
      })
      .catch((e) => {
        logger.error(e);
        return { success: false, error: e.message };
      });
  },
  /** @param {string} token
 * @param {string} newPassword
 * @param {string} confirmPassword
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
  resetPassword: async function (token, newPassword, confirmPassword) {
    return await fetchWithTimeout(`${API_BASE}/system/reset-password`, {
      method: "POST",
      headers: { ...baseHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ token, newPassword, confirmPassword }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || "Error resetting password.");
        }
        return data;
      })
      .catch((e) => {
        logger.error(e);
        return { success: false, error: e.message };
      });
  },

  /** @returns {Promise<boolean>} */
  checkDocumentProcessorOnline: async () => {
    return await fetchWithTimeout(
      `${API_BASE}/system/document-processing-status`,
      {
        headers: baseHeaders(),
      },
    )
      .then((res) => res.ok)
      .catch(() => false);
  },
  /** @returns {Promise<object>} */
  acceptedDocumentTypes: async () => {
    return await fetch(`${API_BASE}/system/accepted-document-types`, {
      headers: baseHeaders(),
    })
      .then((res) => safeJson(res))
      .then((res) => res?.types)
      .catch(() => null);
  },
  /** @param {object} data
 * @returns {Promise<{success: boolean, error: string|null}>} */
  updateSystem: async (data) => {
    return await fetch(`${API_BASE}/system/update-env`, {
      method: "POST",
      headers: { ...baseHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text().catch(() => "Request failed");
          try {
            const json = JSON.parse(text);
            return {
              newValues: null,
              error: json.error || json.message || text,
            };
          } catch {
            return { newValues: null, error: text };
          }
        }
        return res.json();
      })
      .catch((e) => {
        logger.error(e);
        return { newValues: null, error: e.message };
      });
  },
  /** @param {object} data
 * @returns {Promise<{success: boolean, error: string|null}>} */
  updateSystemPassword: async (data) => {
    return await fetch(`${API_BASE}/system/update-password`, {
      method: "POST",
      headers: { ...baseHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text().catch(() => "Request failed");
          try {
            const json = JSON.parse(text);
            return {
              success: false,
              error: json.error || json.message || text,
            };
          } catch {
            return { success: false, error: text };
          }
        }
        return res.json();
      })
      .catch((e) => {
        logger.error(e);
        return { success: false, error: e.message };
      });
  },
  /** @param {object} data
 * @returns {Promise<{success: boolean, error: string|null}>} */
  setupMultiUser: async (data) => {
    return await fetch(`${API_BASE}/system/enable-multi-user`, {
      method: "POST",
      headers: { ...baseHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
      .then((res) => safeJson(res))
      .catch((e) => {
        logger.error(e);
        return { success: false, error: e.message };
      });
  },
  /** @returns {Promise<boolean>} */
  isMultiUserMode: async () => {
    return await fetch(`${API_BASE}/system/multi-user-mode`, {
      method: "GET",
      headers: baseHeaders(),
    })
      .then((res) => safeJson(res))
      .then((res) => res?.multiUserMode)
      .catch((e) => {
        logger.error(e);
        return false;
      });
  },
  /** @param {string} name
 * @returns {Promise<{success: boolean, error: string|null}>} */
  deleteDocument: async (name) => {
    return await fetch(`${API_BASE}/system/remove-document`, {
      method: "DELETE",
      headers: { ...baseHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
      .then((res) => res.ok)
      .catch((e) => {
        logger.error(e);
        return false;
      });
  },
  /** @param {string[]} [names=[]]
 * @returns {Promise<{success: boolean, error: string|null}>} */
  deleteDocuments: async (names = []) => {
    return await fetch(`${API_BASE}/system/remove-documents`, {
      method: "DELETE",
      headers: { ...baseHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ names }),
    })
      .then((res) => res.ok)
      .catch((e) => {
        logger.error(e);
        return false;
      });
  },
  /** @param {string} name
 * @returns {Promise<{success: boolean, error: string|null}>} */
  deleteFolder: async (name) => {
    return await fetch(`${API_BASE}/system/remove-folder`, {
      method: "DELETE",
      headers: { ...baseHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
      .then((res) => res.ok)
      .catch((e) => {
        logger.error(e);
        return false;
      });
  },
  /** @param {FormData} formData
 * @returns {Promise<{success: boolean, error: string|null}>} */
  uploadPfp: async function (formData) {
    return await fetch(`${API_BASE}/system/upload-pfp`, {
      method: "POST",
      body: formData,
      headers: baseHeaders(),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Error uploading pfp.");
        return { success: true, error: null };
      })
      .catch((e) => {
        logger.error(e);
        return { success: false, error: e.message };
      });
  },
  /** @param {FormData} formData
 * @returns {Promise<{success: boolean, error: string|null}>} */
  uploadLogo: async function (formData) {
    return await fetch(`${API_BASE}/system/upload-logo`, {
      method: "POST",
      body: formData,
      headers: baseHeaders(),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Error uploading logo.");
        return { success: true, error: null };
      })
      .catch((e) => {
        logger.error(e);
        return { success: false, error: e.message };
      });
  },
  /** @returns {Promise<Array>} */
  fetchCustomFooterIcons: async function () {
    const cache = safeGetItem(this.cacheKeys.footerIcons);
    const { data, lastFetched } = cache
      ? safeJsonParse(cache, { data: [], lastFetched: 0 })
      : { data: [], lastFetched: 0 };

    if (!!data && Date.now() - lastFetched < 3_600_000)
      return { footerData: data, error: null };

    const { footerData, error } = await fetch(
      `${API_BASE}/system/footer-data`,
      {
        method: "GET",
        cache: "no-cache",
        headers: baseHeaders(),
      },
    )
      .then((res) => safeJson(res))
      .catch((e) => {
        logger.error(e);
        return { footerData: [], error: e.message };
      });

    if (!footerData || !!error) return { footerData: [], error: null };

    const newData = footerData ?? [];
    safeSetItem(
      this.cacheKeys.footerIcons,
      JSON.stringify({ data: newData, lastFetched: Date.now() }),
    );
    return { footerData: newData, error: null };
  },
  /** @returns {Promise<string|null>} */
  fetchSupportEmail: async function () {
    const cache = safeGetItem(this.cacheKeys.supportEmail);
    const { email, lastFetched } = cache
      ? safeJsonParse(cache, { email: "", lastFetched: 0 })
      : { email: "", lastFetched: 0 };

    if (!!email && Date.now() - lastFetched < 3_600_000)
      return { email: email, error: null };

    const { supportEmail, error } = await fetch(
      `${API_BASE}/system/support-email`,
      {
        method: "GET",
        cache: "no-cache",
        headers: baseHeaders(),
      },
    )
      .then((res) => safeJson(res))
      .catch((e) => {
        logger.error(e);
        return { supportEmail: "", error: e.message };
      });

    if (!supportEmail || !!error) return { email: "", error: null };
    safeSetItem(
      this.cacheKeys.supportEmail,
      JSON.stringify({ email: supportEmail, lastFetched: Date.now() }),
    );
    return { email: supportEmail, error: null };
  },

  /** @returns {Promise<string|null>} */
  fetchCustomAppName: async function () {
    const cache = safeGetItem(this.cacheKeys.customAppName);
    const { appName, lastFetched } = cache
      ? safeJsonParse(cache, { appName: "", lastFetched: 0 })
      : { appName: "", lastFetched: 0 };

    if (!!appName && Date.now() - lastFetched < 3_600_000)
      return { appName: appName, error: null };

    const { customAppName, error } = await fetch(
      `${API_BASE}/system/custom-app-name`,
      {
        method: "GET",
        cache: "no-cache",
        headers: baseHeaders(),
      },
    )
      .then((res) => safeJson(res))
      .catch((e) => {
        logger.error(e);
        return { customAppName: "", error: e.message };
      });

    if (!customAppName || !!error) {
      safeRemoveItem(this.cacheKeys.customAppName);
      return { appName: "", error: null };
    }

    safeSetItem(
      this.cacheKeys.customAppName,
      JSON.stringify({ appName: customAppName, lastFetched: Date.now() }),
    );
    return { appName: customAppName, error: null };
  },
  /**
   * Fetches the default system prompt from the server.
   * @returns {Promise<{defaultSystemPrompt: string, saneDefaultSystemPrompt: string}>}
   */
  /** @returns {Promise<string>} */
  fetchDefaultSystemPrompt: async function () {
    return await fetch(`${API_BASE}/system/default-system-prompt`, {
      method: "GET",
      headers: baseHeaders(),
    })
      .then((res) => safeJson(res))
      .then((res) => ({
        defaultSystemPrompt: res.defaultSystemPrompt,
        saneDefaultSystemPrompt: res.saneDefaultSystemPrompt,
      }))
      .catch((e) => {
        logger.error(e);
        return { defaultSystemPrompt: "", saneDefaultSystemPrompt: "" };
      });
  },
  /** @param {string} defaultSystemPrompt
 * @returns {Promise<{success: boolean, error: string|null}>} */
  updateDefaultSystemPrompt: async function (defaultSystemPrompt) {
    try {
      const res = await fetch(`${API_BASE}/system/default-system-prompt`, {
        method: "POST",
        headers: { ...baseHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ defaultSystemPrompt }),
      });
      const data = await res.json();
      return data;
    } catch (e) {
      logger.error(e);
      return { success: false, message: e.message };
    }
  },
  /** @returns {Promise<any>} */
  fetchLogo: async function () {
    const url = new URL(`${fullApiUrl()}/system/logo`);
    // Resolve the stored theme preference (system/light/dark/legacy "default")
    // into a concrete dark-mode boolean so the server returns the correct
    // light/dark logo variant.
    const stored = safeGetItem(THEME_KEY);
    let theme = stored === "default" ? "dark" : stored || "system";
    if (theme === "system") {
      theme =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-color-scheme: light)").matches
          ? "light"
          : "dark";
    }
    url.searchParams.append("darkMode", theme !== "light" ? "true" : "false");

    return await fetch(url, {
      method: "GET",
      cache: "no-cache",
    })
      .then(async (res) => {
        if (res.ok && res.status !== 204) {
          const isCustomLogo = res.headers.get("X-Is-Custom-Logo") === "true";
          const blob = await res.blob();
          const logoURL = URL.createObjectURL(blob);
          return { isCustomLogo, logoURL };
        }
        return { isCustomLogo: false, logoURL: null };
      })
      .catch(() => ({ isCustomLogo: false, logoURL: null }));
  },
  /** @param {string} id
 * @returns {Promise<string|null>} */
  fetchPfp: async function (id) {
    return await fetch(`${API_BASE}/system/pfp/${id}`, {
      method: "GET",
      cache: "no-cache",
      headers: baseHeaders(),
    })
      .then((res) => {
        if (res.ok && res.status !== 204) return res.blob();
        return null;
      })
      .then((blob) => (blob ? URL.createObjectURL(blob) : null))
      .catch(() => {
        return null;
      });
  },
  /** @returns {Promise<{success: boolean, error: string|null}>} */
  removePfp: async function () {
    return await fetch(`${API_BASE}/system/remove-pfp`, {
      method: "DELETE",
      headers: baseHeaders(),
    })
      .then((res) => {
        if (res.ok) return { success: true, error: null };
        throw new Error("Failed to remove pfp.");
      })
      .catch((e) => {
        logger.error(e);
        return { success: false, error: e.message };
      });
  },

  /** @returns {Promise<boolean>} */
  isDefaultLogo: async function () {
    return await fetch(`${API_BASE}/system/is-default-logo`, {
      method: "GET",
      cache: "no-cache",
      headers: baseHeaders(),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to get is default logo!");
        return res.json();
      })
      .then((res) => res?.isDefaultLogo)
      .catch((e) => {
        logger.error(e);
        return null;
      });
  },
  /** @returns {Promise<{success: boolean, error: string|null}>} */
  removeCustomLogo: async function () {
    return await fetch(`${API_BASE}/system/remove-logo`, {
      headers: baseHeaders(),
    })
      .then((res) => {
        if (res.ok) return { success: true, error: null };
        throw new Error("Error removing logo!");
      })
      .catch((e) => {
        logger.error(e);
        return { success: false, error: e.message };
      });
  },
  /** @returns {Promise<{apiKeys: Array, error: string|null}>} */
  getApiKeys: async function () {
    return fetch(`${API_BASE}/system/api-keys`, {
      method: "GET",
      headers: baseHeaders(),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(res.statusText || "Error fetching api key.");
        }
        return res.json();
      })
      .catch((e) => {
        logger.error(e);
        return { apiKey: null, error: e.message };
      });
  },
  /** @param {object} [data={}]
 * @returns {Promise<{apiKey: object|null, error: string|null}>} */
  generateApiKey: async function (data = {}) {
    return fetch(`${API_BASE}/system/generate-api-key`, {
      method: "POST",
      headers: { ...baseHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(res.statusText || "Error generating api key.");
        }
        return res.json();
      })
      .catch((e) => {
        logger.error(e);
        return { apiKey: null, error: e.message };
      });
  },
  /** @param {string} [apiKeyId=""]
 * @returns {Promise<boolean>} */
  deleteApiKey: async function (apiKeyId = "") {
    return fetch(`${API_BASE}/system/api-key/${apiKeyId}`, {
      method: "DELETE",
      headers: baseHeaders(),
    })
      .then((res) => res.ok)
      .catch((e) => {
        logger.error(e);
        return false;
      });
  },
  /** @param {string} provider
   * @param {string|null} [apiKey=null]
   * @param {string|null} [basePath=null]
   * @param {number|null} [timeout=null]
   * @returns {Promise<Array<string>>}
   */
  customModels: async function (
    provider,
    apiKey = null,
    basePath = null,
    timeout = null,
  ) {
    const controller = new AbortController();
    let timerId = null;
    if (!!timeout) {
      timerId = setTimeout(() => {
        controller.abort("Request timed out.");
      }, timeout);
    }

    return fetch(`${API_BASE}/system/custom-models`, {
      method: "POST",
      headers: { ...baseHeaders(), "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        provider,
        apiKey,
        basePath,
      }),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(res.statusText || "Error finding custom models.");
        }
        return res.json();
      })
      .catch((e) => {
        logger.error(e);
        return { models: [], error: e.message };
      })
      .finally(() => {
        if (timerId) clearTimeout(timerId);
      });
  },
  /** @param {number} [offset=0]
 * @returns {Promise<Array>} */
  chats: async (offset = 0) => {
    return await fetch(`${API_BASE}/system/workspace-chats`, {
      method: "POST",
      headers: { ...baseHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ offset }),
    })
      .then((res) => safeJson(res))
      .catch((e) => {
        logger.error(e);
        return [];
      });
  },
  /** @param {number} [offset=0]
 * @returns {Promise<Array>} */
  eventLogs: async (offset = 0) => {
    return await fetch(`${API_BASE}/system/event-logs`, {
      method: "POST",
      headers: { ...baseHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ offset }),
    })
      .then((res) => safeJson(res))
      .catch((e) => {
        logger.error(e);
        return { logs: [], hasPages: false };
      });
  },
  /** @returns {Promise<{success: boolean, error: string|null}>} */
  clearEventLogs: async () => {
    return await fetch(`${API_BASE}/system/event-logs`, {
      method: "DELETE",
      headers: baseHeaders(),
    })
      .then((res) => safeJson(res))
      .catch((e) => {
        logger.error(e);
        return { success: false, error: e.message };
      });
  },
  /** @param {{command: string, cwd?: string}} params
   * @returns {Promise<{stdout: string, stderr: string, exitCode: number}>}
   */
  execTerminalCommand: async function ({ command, cwd = "/app" }) {
    return await fetch(`${API_BASE}/terminal/exec`, {
      method: "POST",
      headers: { ...baseHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ command, cwd }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          return {
            ...data,
            status: res.status,
            error:
              data.error ||
              `Terminal execution failed with status ${res.status}`,
          };
        }
        return {
          stdout: data.stdout || "",
          stderr: data.stderr || "",
          exitCode: data.exitCode ?? 0,
          status: res.status,
        };
      })
      .catch((e) => {
        logger.error(e);
        return { stdout: "", stderr: "", exitCode: -1, error: e.message };
      });
  },
  /** @param {string} chatId
 * @returns {Promise<{success: boolean, error: string|null}>} */
  deleteChat: async (chatId) => {
    return await fetch(`${API_BASE}/system/workspace-chats/${chatId}`, {
      method: "DELETE",
      headers: baseHeaders(),
    })
      .then((res) => safeJson(res))
      .catch((e) => {
        logger.error(e);
        return { success: false, error: e.message };
      });
  },
  /** @param {string} [type="csv"]
 * @param {string} [chatType="workspace"]
 * @returns {Promise<Blob>} */
  exportChats: async (type = "csv", chatType = "workspace") => {
    const url = new URL(`${fullApiUrl()}/system/export-chats`);
    url.searchParams.append("type", type);
    url.searchParams.append("chatType", chatType);
    return await fetch(url, {
      method: "GET",
      headers: baseHeaders(),
    })
      .then((res) => {
        if (res.ok) return res.text();
        throw new Error(res.statusText);
      })
      .catch((e) => {
        logger.error(e);
        return null;
      });
  },
  /** @param {object} data
 * @returns {Promise<{success: boolean, error: string|null}>} */
  updateUser: async (data) => {
    return await fetch(`${API_BASE}/system/user`, {
      method: "POST",
      headers: { ...baseHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
      .then((res) => safeJson(res))
      .catch((e) => {
        logger.error(e);
        return { success: false, error: e.message };
      });
  },
  dataConnectors: DataConnector,

  /** @returns {Promise<Array>} */
  getSlashCommandPresets: async function () {
    return await fetch(`${API_BASE}/system/slash-command-presets`, {
      method: "GET",
      headers: baseHeaders(),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Could not fetch slash command presets.");
        return res.json();
      })
      .then((res) => res.presets)
      .catch((e) => {
        logger.error(e);
        return [];
      });
  },

  /** @param {object} presetData
 * @returns {Promise<{preset: object|null, error: string|null}>} */
  createSlashCommandPreset: async function (presetData) {
    return await fetch(`${API_BASE}/system/slash-command-presets`, {
      method: "POST",
      headers: { ...baseHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(presetData),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok)
          throw new Error(
            data.message || "Error creating slash command preset.",
          );
        return data;
      })
      .then((res) => ({ preset: res.preset, error: null }))
      .catch((e) => {
        logger.error(e);
        return { preset: null, error: e.message };
      });
  },

  /** @param {string} presetId
 * @param {object} presetData
 * @returns {Promise<{preset: object|null, error: string|null}>} */
  updateSlashCommandPreset: async function (presetId, presetData) {
    return await fetch(`${API_BASE}/system/slash-command-presets/${presetId}`, {
      method: "POST",
      headers: { ...baseHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(presetData),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok)
          throw new Error(
            data.message || "Could not update slash command preset.",
          );
        return data;
      })
      .then((res) => ({ preset: res.preset, error: null }))
      .catch((e) => {
        logger.error(e);
        return { preset: null, error: e.message };
      });
  },

  /** @param {string} presetId
 * @returns {Promise<{success: boolean, error: string|null}>} */
  deleteSlashCommandPreset: async function (presetId) {
    return await fetch(`${API_BASE}/system/slash-command-presets/${presetId}`, {
      method: "DELETE",
      headers: baseHeaders(),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Could not delete slash command preset.");
        return true;
      })
      .catch((e) => {
        logger.error(e);
        return false;
      });
  },

  /**
   * Fetches the can view chat history state from local storage or the system settings.
   * Notice: This is an instance setting that cannot be changed via the UI and it is cached
   * in local storage for 24 hours.
   * @returns {Promise<{viewable: boolean, error: string | null}>}
   */
  /** @returns {Promise<any>} */
  fetchCanViewChatHistory: async function () {
    const cache = safeGetItem(this.cacheKeys.canViewChatHistory);
    const { viewable, lastFetched } = cache
      ? safeJsonParse(cache, { viewable: false, lastFetched: 0 })
      : { viewable: false, lastFetched: 0 };

    // Since this is an instance setting that cannot be changed via the UI,
    // we can cache it in local storage for a day and if the admin changes it,
    // they should instruct the users to clear local storage.
    if (typeof viewable === "boolean" && Date.now() - lastFetched < 8.64e7)
      return { viewable, error: null };

    const res = await System.keys();
    const isViewable = res?.DisableViewChatHistory === false;

    safeSetItem(
      this.cacheKeys.canViewChatHistory,
      JSON.stringify({ viewable: isViewable, lastFetched: Date.now() }),
    );
    return { viewable: isViewable, error: null };
  },

  /**
   * Validates a temporary auth token and logs in the user if the token is valid.
   * @param {string} publicToken - the token to validate against
   * @returns {Promise<{valid: boolean, user: import("@prisma/client").users | null, token: string | null, message: string | null}>}
   */
  /** @param {string} publicToken
 * @returns {Promise<{token: string|null, user: object|null, error: string|null}>} */
  simpleSSOLogin: async function (publicToken) {
    return fetch(`${API_BASE}/request-token/sso/simple?token=${publicToken}`, {
      method: "GET",
    })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          if (!text.startsWith("{")) throw new Error(text);
          return JSON.parse(text);
        }
        return await res.json();
      })
      .catch((e) => {
        logger.error(e);
        return { valid: false, user: null, token: null, message: e.message };
      });
  },

  /**
   * Fetches the app version from the server.
   * @returns {Promise<string | null>} The app version.
   */
  /** @returns {Promise<string|null>} */
  fetchAppVersion: async function () {
    const cache = safeGetItem(this.cacheKeys.deploymentVersion);
    const { version, lastFetched } = cache
      ? safeJsonParse(cache, { version: null, lastFetched: 0 })
      : { version: null, lastFetched: 0 };

    if (!!version && Date.now() - lastFetched < 3_600_000) return version;
    const newVersion = await fetch(`${API_BASE}/utils/metrics`, {
      method: "GET",
      cache: "no-cache",
      headers: baseHeaders(),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Could not fetch app version.");
        return res.json();
      })
      .then((res) => res?.appVersion)
      .catch(() => null);

    if (!newVersion) return null;
    safeSetItem(
      this.cacheKeys.deploymentVersion,
      JSON.stringify({ version: newVersion, lastFetched: Date.now() }),
    );
    return newVersion;
  },

  /**
   * Validates a SQL connection string.
   * @param {'postgresql'|'mysql'|'sql-server'} engine - the database engine identifier
   * @param {string} connectionString - the connection string to validate
   * @returns {Promise<{success: boolean, error: string | null}>}
   */
  /** @param {string} engine
 * @param {string} connectionString
 * @returns {Promise<{success: boolean, error: string|null}>} */
  validateSQLConnection: async function (engine, connectionString) {
    return fetch(`${API_BASE}/system/validate-sql-connection`, {
      method: "POST",
      headers: { ...baseHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ engine, connectionString }),
    })
      .then((res) => safeJson(res))
      .catch((e) => {
        logger.error("Failed to validate SQL connection:", e);
        return { success: false, error: e.message };
      });
  },

  /**
   * Checks if the filesystem-agent skill is available.
   * The filesystem-agent skill is only available when running in a Docker container.
   * @returns {Promise<boolean>}
   */
  /** @returns {Promise<boolean>} */
  isFileSystemAgentAvailable: async function () {
    return fetch(`${API_BASE}/agent-skills/filesystem-agent/is-available`, {
      method: "GET",
      headers: baseHeaders(),
    })
      .then((res) => safeJson(res))
      .then((res) => res?.available ?? false)
      .catch(() => false);
  },

  /**
   * Checks if the create-files-agent skill is available.
   * The create-files-agent skill is only available when running in a Docker container.
   * @returns {Promise<boolean>}
   */
  /** @returns {Promise<boolean>} */
  isCreateFilesAgentAvailable: async function () {
    return fetch(`${API_BASE}/agent-skills/create-files-agent/is-available`, {
      method: "GET",
      headers: baseHeaders(),
    })
      .then((res) => safeJson(res))
      .then((res) => res?.available ?? false)
      .catch(() => false);
  },

  /**
   * Send a recorded audio blob to the configured server-side STT provider
   * for transcription. Returns the transcribed text or an error string.
   * @param {Blob} audioBlob - Recorded audio (e.g., audio/webm) to transcribe.
   * @param {string} [filename] - Filename hint for the upload.
   * @returns {Promise<{text: string|null, error: string|null}>}
   */
  /** @param {Blob} audioBlob
 * @param {string} [filename="audio.webm"]
 * @returns {Promise<{text: string|null, error: string|null}>} */
  transcribeAudio: async function (audioBlob, filename = "audio.webm") {
    const formData = new FormData();
    formData.append("audio", audioBlob, filename);
    return fetch(`${API_BASE}/system/transcribe-audio`, {
      method: "POST",
      headers: baseHeaders(),
      body: formData,
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok)
          throw new Error(json?.error || "Failed to transcribe audio.");
        return { text: json?.text ?? "", error: null };
      })
      .catch((e) => ({ text: null, error: e.message }));
  },

  experimentalFeatures: {
    liveSync: LiveDocumentSync,
    agentPlugins: AgentPlugins,
  },
  promptVariables: SystemPromptVariable,
};

export default System;
