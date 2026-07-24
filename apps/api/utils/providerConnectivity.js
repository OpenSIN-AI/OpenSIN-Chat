// SPDX-License-Identifier: MIT
/**
 * Active connectivity probes for local/self-hosted LLM providers.
 * Complements providerKeyStatus.js: key status tells you WHAT is configured,
 * these probes tell you whether the configured base path actually answers.
 * Uses the global fetch (Node 18+) with a hard timeout — never throws.
 */
const { LOCAL_PROVIDERS } = require("./providerKeyStatus");

const PROBE_TIMEOUT_MS = 4_000;

/**
 * Probe a single base URL. Any HTTP response (even 401/404) counts as
 * reachable — we only test network reachability, not auth or API shape.
 * @param {string} baseUrl
 * @returns {Promise<{reachable: boolean, status: number|null, latencyMs: number|null, error: string|null}>}
 */
async function probeBaseUrl(baseUrl) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  const startedAt = Date.now();
  try {
    const res = await fetch(baseUrl, {
      method: "GET",
      signal: controller.signal,
      redirect: "manual",
    });
    return {
      reachable: true,
      status: res.status,
      latencyMs: Date.now() - startedAt,
      error: null,
    };
  } catch (e) {
    const aborted = e?.name === "AbortError";
    return {
      reachable: false,
      status: null,
      latencyMs: null,
      error: aborted
        ? `Timeout after ${PROBE_TIMEOUT_MS}ms`
        : e?.cause?.code || e?.message || "Unknown network error",
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Probe one registered provider by its id. Unconfigured providers are
 * reported as skipped instead of failed.
 * @param {string} providerId - id from LOCAL_PROVIDERS (e.g. "koboldcpp")
 * @returns {Promise<{provider: string, name: string, configured: boolean,
 *           baseUrl: string|null, reachable: boolean, status: number|null,
 *           latencyMs: number|null, error: string|null}>}
 */
async function probeProvider(providerId) {
  const def = LOCAL_PROVIDERS.find((p) => p.provider === providerId);
  if (!def)
    return {
      provider: providerId,
      name: providerId,
      configured: false,
      baseUrl: null,
      reachable: false,
      status: null,
      latencyMs: null,
      error: "Unknown provider id",
    };

  const baseUrl = (process.env[def.basePathKey] || "").trim();
  if (!baseUrl)
    return {
      provider: def.provider,
      name: def.name,
      configured: false,
      baseUrl: null,
      reachable: false,
      status: null,
      latencyMs: null,
      error: null,
    };

  const result = await probeBaseUrl(baseUrl);
  return {
    provider: def.provider,
    name: def.name,
    configured: true,
    baseUrl,
    ...result,
  };
}

/**
 * Probe all configured providers in parallel.
 * @returns {Promise<Array>} one result per registered provider
 */
async function probeAllProviders() {
  return await Promise.all(
    LOCAL_PROVIDERS.map(({ provider }) => probeProvider(provider)),
  );
}

module.exports = { probeProvider, probeAllProviders, PROBE_TIMEOUT_MS };
