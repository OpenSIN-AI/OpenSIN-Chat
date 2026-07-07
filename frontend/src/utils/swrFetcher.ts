// SPDX-License-Identifier: MIT
import { API_BASE } from "@/utils/constants";
import { AUTH_TOKEN, AUTH_USER, AUTH_TIMESTAMP } from "@/utils/constants";
import { baseHeaders } from "@/utils/request";
import { fetchWithTimeout } from "@/utils/fetchWithTimeout";
import { safeRemoveItem } from "@/utils/safeStorage";
import paths from "@/utils/paths";

let redirectingToLogin = false;

/**
 * Clears auth-related localStorage keys and redirects to the login page.
 * Guarded by a module-level flag so that multiple simultaneous 401s
 * only trigger one redirect.
 */
export function handleAuthFailure() {
  if (redirectingToLogin) return;
  redirectingToLogin = true;
  safeRemoveItem(AUTH_USER);
  safeRemoveItem(AUTH_TOKEN);
  safeRemoveItem(AUTH_TIMESTAMP);
  window.location.replace(paths.login());
  // Reset the flag after a short delay so that if the redirect fails
  // (e.g. blocked by browser policy) future 401s can still trigger.
  setTimeout(() => {
    redirectingToLogin = false;
  }, 5000);
}

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
  let url;
  if (typeof key === "string" && /^https?:\/\//.test(key)) {
    url = key;
  } else if (typeof key === "string" && key.startsWith(API_BASE)) {
    url = key;
  } else {
    url = `${API_BASE}${key}`;
  }

  const res = await fetchWithTimeout(url, { headers: baseHeaders() });
  if (!res.ok) {
    if (res.status === 401) handleAuthFailure();
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
 * - `onError` intercepts 401 responses and redirects to the login page,
 *   clearing stale auth tokens so the user is not stuck on a broken session.
 */
export const swrConfig = {
  fetcher: swrFetcher,
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  shouldRetryOnError: (err) => err?.status !== 401,
  errorRetryCount: 3,
  dedupingInterval: 5000,
  onError: (err) => {
    if (err?.status === 401) handleAuthFailure();
  },
};

export default swrFetcher;
