// SPDX-License-Identifier: MIT
/**
 * Admin model - Typed version of models/admin.js
 * Handles admin operations and system preferences.
 */

import { fullApiUrl } from "@/utils/constants";
import { baseHeaders } from "@/utils/request";

export interface SystemPreference {
  [key: string]: any;
}

export interface SystemPreferencesResponse {
  settings: SystemPreference;
}

const Admin: any = {
  /**
   * Get system preferences by field names
   */
  systemPreferencesByFields: async function (
    fields: string[],
  ): Promise<SystemPreferencesResponse> {
    try {
      const res = await fetch(`${fullApiUrl()}/system/preferences`, {
        method: "POST",
        headers: baseHeaders(),
        body: JSON.stringify({ fields }),
      });
      if (!res.ok) return { settings: {} };
      const json = await res.json();
      return json;
    } catch {
      return { settings: {} };
    }
  },

  /**
   * Update system preferences
   */
  updateSystemPreferences: async function (
    data: Record<string, unknown>,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`${fullApiUrl()}/system/preferences/update`, {
        method: "POST",
        headers: baseHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.text();
        return { success: false, error };
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  /**
   * Get all system users
   */
  users: async function (): Promise<Array<{ id: number; email: string }>> {
    try {
      const res = await fetch(`${fullApiUrl()}/system/users`, {
        headers: baseHeaders(),
      });
      if (!res.ok) return [];
      const json = await res.json();
      return json?.users || [];
    } catch {
      return [];
    }
  },
};

export default Admin;
