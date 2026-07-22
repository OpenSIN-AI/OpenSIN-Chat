// SPDX-License-Identifier: MIT
/**
 * Global 401 response interceptor.
 *
 * Patches `window.fetch` once so authenticated API requests that return 401
 * clear stale credentials and redirect to login. Requests to unrelated or
 * attacker-controlled origins must never be able to trigger a local logout.
 */
import { handleAuthFailure } from "@/utils/swrFetcher";

let installed = false;

function requestUrl(input: RequestInfo | URL): URL | null {
  try {
    const rawUrl =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input instanceof Request
            ? input.url
            : "";
    return rawUrl ? new URL(rawUrl, window.location.origin) : null;
  } catch {
    return null;
  }
}

function isProtectedApiRequest(input: RequestInfo | URL): boolean {
  const url = requestUrl(input);
  if (!url) return false;

  const configuredBase = String(import.meta.env.VITE_API_BASE || "/api");
  let apiBase: URL;
  try {
    apiBase = new URL(configuredBase, window.location.origin);
  } catch {
    return false;
  }

  const basePath = apiBase.pathname.replace(/\/+$/, "") || "/";
  const matchesConfiguredApi =
    url.origin === apiBase.origin &&
    (url.pathname === basePath ||
      (basePath !== "/" && url.pathname.startsWith(`${basePath}/`)));

  const matchesSameOriginPdfApi =
    url.origin === window.location.origin &&
    (url.pathname === "/pdf-analysis" ||
      url.pathname.startsWith("/pdf-analysis/"));

  return matchesConfiguredApi || matchesSameOriginPdfApi;
}

export function installAuthInterceptor(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const originalFetch = window.fetch;
  window.fetch = async function interceptedFetch(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const response = await originalFetch.call(window, input, init);

    if (response.status === 401 && isProtectedApiRequest(input)) {
      handleAuthFailure();
    }

    return response;
  };
}
