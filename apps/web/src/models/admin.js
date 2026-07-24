// SPDX-License-Identifier: MIT
import { API_BASE } from "@/utils/constants";
import { baseHeaders } from "@/utils/request";
import logger from "@/utils/logger";

/**
 * Safely parse a JSON response body.
 * Returns the parsed JSON or a fallback when the body is not valid JSON
 * (e.g. when the server sends "Unauthorized" text for 401 responses).
 */
/** @param {Response} res
 * @param {*} fallback
 * @returns {Promise<*>}
 */
async function safeJson(res, fallback) {
  if (!res.ok) return fallback;
  try {
    return await res.json();
  } catch {
    return fallback;
  }
}

const Admin = {
  // User Management
  /** @returns {Promise<Array>} */
  users: async () => {
    return await fetch(`${API_BASE}/admin/users`, {
      method: "GET",
      headers: baseHeaders(),
    })
      .then((res) => safeJson(res, { users: [] }))
      .then((res) => res?.users || [])
      .catch((e) => {
        logger.error("admin.users failed:", e);
        return [];
      });
  },
  /** @param {object} data
   * @returns {Promise<{user: object|null, error: string|null}>} */
  newUser: async (data) => {
    return await fetch(`${API_BASE}/admin/users/new`, {
      method: "POST",
      headers: { ...baseHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
      .then((res) => safeJson(res, { user: null, error: "Request failed" }))
      .catch((e) => ({ user: null, error: e.message }));
  },
  /** @param {string} userId
   * @param {object} data
   * @returns {Promise<{success: boolean, error: string|null}>} */
  updateUser: async (userId, data) => {
    return await fetch(`${API_BASE}/admin/user/${userId}`, {
      method: "POST",
      headers: { ...baseHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
      .then((res) => safeJson(res, { success: false, error: "Request failed" }))
      .catch((e) => ({ success: false, error: e.message }));
  },
  /** @param {string} userId
   * @returns {Promise<{success: boolean, error: string|null}>} */
  deleteUser: async (userId) => {
    return await fetch(`${API_BASE}/admin/user/${userId}`, {
      method: "DELETE",
      headers: baseHeaders(),
    })
      .then((res) => safeJson(res, { success: false, error: "Request failed" }))
      .catch((e) => ({ success: false, error: e.message }));
  },

  // Invitations
  /** @returns {Promise<Array>} */
  invites: async () => {
    return await fetch(`${API_BASE}/admin/invites`, {
      method: "GET",
      headers: baseHeaders(),
    })
      .then((res) => safeJson(res, { invites: [] }))
      .then((res) => res?.invites || [])
      .catch((e) => {
        logger.error("admin.invites failed:", e);
        return [];
      });
  },
  /** @param {{role?: string|null, workspaceIds?: Array<string>|null}} params
   * @returns {Promise<{invite: object|null, error: string|null}>} */
  newInvite: async ({ role = null, workspaceIds = null }) => {
    return await fetch(`${API_BASE}/admin/invite/new`, {
      method: "POST",
      headers: { ...baseHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        role,
        workspaceIds,
      }),
    })
      .then((res) => safeJson(res, { invite: null, error: "Request failed" }))
      .catch((e) => ({ invite: null, error: e.message }));
  },
  /** @param {string} inviteId
   * @returns {Promise<{success: boolean, error: string|null}>} */
  disableInvite: async (inviteId) => {
    return await fetch(`${API_BASE}/admin/invite/${inviteId}`, {
      method: "DELETE",
      headers: baseHeaders(),
    })
      .then((res) => safeJson(res, { success: false, error: "Request failed" }))
      .catch((e) => ({ success: false, error: e.message }));
  },

  // Workspaces Mgmt
  /** @returns {Promise<Array>} */
  workspaces: async () => {
    return await fetch(`${API_BASE}/admin/workspaces`, {
      method: "GET",
      headers: baseHeaders(),
    })
      .then((res) => safeJson(res, { workspaces: [] }))
      .then((res) => res?.workspaces || [])
      .catch((e) => {
        logger.error("admin.workspaces failed:", e);
        return [];
      });
  },
  /** @param {string} workspaceId
   * @returns {Promise<Array>} */
  workspaceUsers: async (workspaceId) => {
    return await fetch(`${API_BASE}/admin/workspaces/${workspaceId}/users`, {
      method: "GET",
      headers: baseHeaders(),
    })
      .then((res) => safeJson(res, { users: [] }))
      .then((res) => res?.users || [])
      .catch((e) => {
        logger.error("admin.workspaceUsers failed:", e);
        return [];
      });
  },
  /** @param {string} name
   * @returns {Promise<{workspace: object|null, error: string|null}>} */
  newWorkspace: async (name) => {
    return await fetch(`${API_BASE}/admin/workspaces/new`, {
      method: "POST",
      headers: { ...baseHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
      .then((res) =>
        safeJson(res, { workspace: null, error: "Request failed" }),
      )
      .catch((e) => ({ workspace: null, error: e.message }));
  },
  /** @param {string} workspaceId
   * @param {string[]} [userIds=[]]
   * @returns {Promise<{success: boolean, error: string|null}>} */
  updateUsersInWorkspace: async (workspaceId, userIds = []) => {
    return await fetch(
      `${API_BASE}/admin/workspaces/${workspaceId}/update-users`,
      {
        method: "POST",
        headers: { ...baseHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ userIds }),
      },
    )
      .then((res) => safeJson(res, { success: false, error: "Request failed" }))
      .catch((e) => ({ success: false, error: e.message }));
  },
  /** @param {string|number} workspaceId
   * @returns {Promise<{success: boolean, error: string|null}>} */
  deleteWorkspace: async (workspaceId) => {
    return await fetch(`${API_BASE}/admin/workspaces/${workspaceId}`, {
      method: "DELETE",
      headers: baseHeaders(),
    })
      .then((res) => safeJson(res, { success: false, error: "Request failed" }))
      .catch((e) => ({ success: false, error: e.message }));
  },

  // System Preferences
  /**
   * Fetches system preferences by fields
   * @param {string[]} labels - Array of labels for settings
   * @returns {Promise<{settings: Object, error: string}>} - System preferences object
   */
  /** @param {string[]} [labels=[]]
   * @returns {Promise<{settings?: Record<string, any>, error?: string}|null>} */
  systemPreferencesByFields: async (labels = []) => {
    return await fetch(
      `${API_BASE}/admin/system-preferences-for?labels=${labels.join(",")}`,
      {
        method: "GET",
        headers: baseHeaders(),
      },
    )
      .then((res) => safeJson(res, null))
      .catch((e) => {
        logger.error("admin.systemPreferencesByFields failed:", e);
        return null;
      });
  },
  /** @param {object} [updates={}]
   * @returns {Promise<{success: boolean, error: string|null}>} */
  updateSystemPreferences: async (updates = {}) => {
    return await fetch(`${API_BASE}/admin/system-preferences`, {
      method: "POST",
      headers: { ...baseHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    })
      .then((res) => safeJson(res, { success: false, error: "Request failed" }))
      .catch((e) => ({ success: false, error: e.message }));
  },

  // API Keys
  /** @returns {Promise<{apiKeys: Array, error: string|null}>} */
  getApiKeys: async function () {
    return fetch(`${API_BASE}/admin/api-keys`, {
      method: "GET",
      headers: baseHeaders(),
    })
      .then((res) => safeJson(res, { apiKeys: [], error: "Request failed" }))
      .catch((e) => ({ apiKeys: [], error: e.message }));
  },
  /** @param {object} [data={}]
   * @returns {Promise<{apiKey: Record<string, any>|null, error: string|null}>} */
  generateApiKey: async function (data = {}) {
    return fetch(`${API_BASE}/admin/generate-api-key`, {
      method: "POST",
      headers: { ...baseHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
      .then((res) => safeJson(res, { apiKey: null, error: "Request failed" }))
      .catch((e) => ({ apiKey: null, error: e.message }));
  },
  /** @param {string} [apiKeyId=""]
   * @returns {Promise<boolean>} */
  deleteApiKey: async function (apiKeyId = "") {
    return fetch(`${API_BASE}/admin/delete-api-key/${apiKeyId}`, {
      method: "DELETE",
      headers: baseHeaders(),
    })
      .then((res) => res.ok)
      .catch((e) => {
        logger.error("admin.deleteApiKey failed:", e);
        return false;
      });
  },
};

export default Admin;
