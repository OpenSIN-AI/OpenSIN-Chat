// SPDX-License-Identifier: MIT
import { API_BASE } from "@/utils/constants";
import { baseHeaders } from "@/utils/request";
import { fetchWithTimeout } from "@/utils/fetchWithTimeout";

/**
 * Global SWR fetcher used as the default `fetcher` in `<SWRConfig>`.
 *
 * It is intended for string keys that represent an API path (or absolute URL).
 * Authenticated requests reuse the same `baseHeaders()` (Bearer token) as the
 * rest of the app, so SWR-driven requests behave identically to the existing
 * model-layer fetches.
 *
 * For richer/parameterized reads, prefer passing a dedicated fetcher function to
 * `useSWR` (e.g. `useSWR(["workspace", slug], () => Workspace.bySlug(slug))`).
 * Those hooks live in `src/hooks/` and wrap the existing `src/models/` methods.
 *
 * @param {string} key - An API path (e.g. "/workspaces") or an absolute URL.
 * @returns {Promise<any>} Parsed JSON response.
 * @throws {Error & { status?: number, info?: any }} On non-2xx responses.
 */
export async function swrFetcher(key) {
  const url =
    typeof key === "string" && /^https?:\/\//.test(key)
      ? key
      : `${API_BASE}${key}`;

  const res = await fetchWithTimeout(url, { headers: baseHeaders() });
  if (!res.ok) {
    const error = new Error(
      `Request failed with HTTP ${res.status}`,
    ) as Error & { status: number; info: any };
    error.status = res.status;
    error.info = await res.json().catch(() => null);
    throw error;
  }
  return res.json();
}

/**
 * Shared default SWR configuration.
 *
 * - `dedupingInterval` collapses identical requests fired within 5s into one.
 * - `revalidateOnFocus` / `revalidateOnReconnect` enable stale-while-revalidate
 *   so the user never stares at stale data after switching tabs.
 * - `errorRetryCount` bounds retries to avoid hammering the backend.
 */
export const swrConfig = {
  fetcher: swrFetcher,
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  shouldRetryOnError: true,
  errorRetryCount: 3,
  dedupingInterval: 5000,
};

export default swrFetcher;
