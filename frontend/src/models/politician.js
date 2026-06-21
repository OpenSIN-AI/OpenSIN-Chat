// SPDX-License-Identifier: MIT
import { API_BASE } from "@/utils/constants";
import { baseHeaders } from "@/utils/request";

const Politician = {
  /**
   * Add a politician record (profile + speeches) as an embedded document to the
   * current workspace. The server builds a text document, processes it through
   * the collector, and embeds it into the workspace vector store.
   * @param {string} politicianId
   * @param {string} workspaceSlug
   * @returns {Promise<{success: boolean, message?: string, error?: string}>}
   */
  addToWorkspace: async function (politicianId, workspaceSlug) {
    try {
      const res = await fetch(
        `${API_BASE}/api/politician/${politicianId}/add-to-workspace`,
        {
          method: "POST",
          headers: baseHeaders(),
          body: JSON.stringify({ workspaceSlug }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error || `HTTP ${res.status}`,
        };
      }
      return { success: true, data };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },
};

export default Politician;
