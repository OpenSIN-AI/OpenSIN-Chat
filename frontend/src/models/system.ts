// SPDX-License-Identifier: MIT
/**
 * System model - Typed version of models/system.js
 * Handles system configuration, settings, and auth checks.
 */

import { API_BASE, AUTH_TIMESTAMP, fullApiUrl } from "@/utils/constants";
import { baseHeaders, safeJsonParse } from "@/utils/request";
import type { ApiResponse } from "@/types/api";

interface SystemKeys {
  [key: string]: unknown;
}

interface OnboardingStatus {
  onboardingComplete: boolean;
}

interface SetupComplete {
  results: SystemKeys;
}

const System: any = {
  /**
   * Check if backend is reachable
   */
  ping: async function (): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/ping`);
      const json = await res.json();
      return json?.online || false;
    } catch {
      return false;
    }
  },

  /**
   * Get total vector count
   */
  totalIndexes: async function (slug?: string | null): Promise<number> {
    try {
      const url = new URL(`${fullApiUrl()}/system/system-vectors`);
      if (slug) url.searchParams.append("slug", encodeURIComponent(slug));
      const res = await fetch(url.toString(), { headers: baseHeaders() });
      if (!res.ok) return 0;
      const json = await res.json();
      return json?.vectorCount || 0;
    } catch {
      return 0;
    }
  },

  /**
   * Check if onboarding is complete
   */
  isOnboardingComplete: async function (): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/onboarding`);
      if (!res.ok) return false;
      const json = (await res.json()) as OnboardingStatus;
      return json?.onboardingComplete || false;
    } catch {
      return false;
    }
  },

  /**
   * Mark onboarding as complete
   */
  markOnboardingComplete: async function (): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/onboarding`, {
        method: "POST",
        headers: baseHeaders(),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  /**
   * Get system configuration keys
   */
  keys: async function (): Promise<SystemKeys | null> {
    try {
      const res = await fetch(`${API_BASE}/setup-complete`);
      if (!res.ok) return null;
      const json = (await res.json()) as SetupComplete;
      return json?.results || null;
    } catch {
      return null;
    }
  },

  /**
   * Get local files info
   */
  localFiles: async function (): Promise<string[] | null> {
    try {
      const res = await fetch(`${API_BASE}/system/local-files`, {
        headers: baseHeaders(),
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json?.localFiles || null;
    } catch {
      return null;
    }
  },

  /**
   * Check if auth token needs verification
   */
  needsAuthCheck: function (): boolean {
    const lastAuthCheck = window.localStorage.getItem(AUTH_TIMESTAMP);
    if (!lastAuthCheck) return true;
    const expiresAtMs = Number(lastAuthCheck) + 60 * 5 * 1000; // 5 minutes
    return Number(new Date()) > expiresAtMs;
  },

  /**
   * Verify current auth token
   */
  checkAuth: async function (currentToken?: string | null): Promise<boolean> {
    try {
      const valid = await fetch(`${API_BASE}/system/check-token`, {
        headers: baseHeaders(currentToken || undefined),
      }).then((res) => res.ok);

      window.localStorage.setItem(AUTH_TIMESTAMP, String(Number(new Date())));
      return valid;
    } catch {
      return false;
    }
  },

  /**
   * Request new auth token
   */
  requestToken: async function (body: Record<string, unknown>): Promise<string | null> {
    try {
      const res = await fetch(`${API_BASE}/request-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json?.token || null;
    } catch {
      return null;
    }
  },

  /**
   * Update system configuration
   */
  updateSystem: async function (data: Record<string, unknown>): Promise<{ success: boolean }> {
    try {
      const res = await fetch(`${API_BASE}/system/update`, {
        method: "POST",
        headers: baseHeaders(),
        body: JSON.stringify(data),
      });
      return { success: res.ok };
    } catch {
      return { success: false };
    }
  },

  /**
   * Check if file system agent is available
   */
  isFileSystemAgentAvailable: async function (): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/system/agents/filesystem/available`, {
        headers: baseHeaders(),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  /**
   * Check if create files agent is available
   */
  isCreateFilesAgentAvailable: async function (): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/system/agents/create-files/available`, {
        headers: baseHeaders(),
      });
      return res.ok;
    } catch {
      return false;
    }
  },
};

export default System;
