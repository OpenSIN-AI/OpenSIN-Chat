// SPDX-License-Identifier: MIT
/**
 * Global 401 response interceptor.
 *
 * Patches `window.fetch` once at module-evaluation time so that ANY fetch
 * call to the app's API (`/api/...`) that returns HTTP 401 triggers
 * `handleAuthFailure()` — clearing stale auth tokens and redirecting to
 * the login page.
 *
 * This is necessary because many model-layer methods (e.g. `Workspace.all`)
 * catch fetch errors internally and return default values (`[]`, `null`),
 * which means SWR's `onError` handler never fires. The interceptor operates
 * at the transport layer, before the model layer can swallow the error.
 *
 * The patch is idempotent: importing this module more than once is safe.
 */
import { handleAuthFailure } from "@/utils/swrFetcher";

let installed = false;

export function installAuthInterceptor(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const originalFetch = window.fetch;
  window.fetch = async function interceptedFetch(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const response = await originalFetch.call(this, input, init);

    // Only intercept 401s on API calls (relative /api/ paths or same-origin).
    if (response.status === 401) {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input instanceof Request
              ? input.url
              : "";
      if (url.includes("/api/") || url.startsWith("/api/")) {
        handleAuthFailure();
      }
    }

    return response;
  };
}
