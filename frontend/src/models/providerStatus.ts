// SPDX-License-Identifier: MIT
import { API_BASE } from "@/utils/constants";
import { baseHeaders } from "@/utils/request";

export interface ProviderKeyStatus {
  provider: string;
  name: string;
  envKey: string;
  configured: boolean;
  keySet: boolean;
  fallbackActive: boolean;
}

export interface PathsHealth {
  storageDirSet: boolean;
  storagePath: string;
  storageExists: boolean;
  storageWritable: boolean;
  collectorPath: string;
  hotdirExists: boolean;
}

export interface ProviderStatusResponse {
  providers: ProviderKeyStatus[];
  paths: PathsHealth | null;
  checkedAt: string | null;
  error?: string;
}

export interface ConnectivityResult {
  provider: string;
  name: string;
  configured: boolean;
  baseUrl: string | null;
  reachable: boolean;
  status: number | null;
  latencyMs: number | null;
  error: string | null;
}

export interface ConnectivityResponse {
  results: ConnectivityResult[];
  checkedAt: string | null;
  error?: string;
}

const ProviderStatus = {
  /** Key/fallback status of all local LLM providers + path health. Fast, no network probes. */
  status: async function (): Promise<ProviderStatusResponse> {
    return await fetch(`${API_BASE}/system/provider-key-status`, {
      headers: baseHeaders(),
    })
      .then((res) => {
        if (!res.ok)
          throw new Error(
            `Could not fetch provider status (HTTP ${res.status}).`,
          );
        return res.json();
      })
      .catch((e) => {
        console.error(e);
        return {
          providers: [],
          paths: null,
          checkedAt: null,
          error: e.message,
        };
      });
  },

  /**
   * Actively probe provider base paths for reachability.
   * Pass a provider id to probe a single provider only.
   */
  connectivity: async function (
    provider: string | null = null,
  ): Promise<ConnectivityResponse> {
    const qs = provider ? `?provider=${encodeURIComponent(provider)}` : "";
    return await fetch(`${API_BASE}/system/provider-connectivity${qs}`, {
      headers: baseHeaders(),
    })
      .then((res) => {
        if (!res.ok)
          throw new Error(`Connectivity check failed (HTTP ${res.status}).`);
        return res.json();
      })
      .catch((e) => {
        console.error(e);
        return { results: [], checkedAt: null, error: e.message };
      });
  },
};

export default ProviderStatus;
