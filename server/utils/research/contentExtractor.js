// SPDX-License-Identifier: MIT
/**
 * Content extractor — fetches URL content and converts to clean text.
 *
 * Docs: contentExtractor.doc.md
 * Purpose: Extract readable content from URLs for the research pipeline.
 * Uses fetch + basic HTML-to-text conversion.
 * SSRF-hardened: validates URL scheme, blocks private IPs, limits redirects and response size.
 * Resilience: fetchWithTimeout on HTTP calls, circuit breaker on fetch, SWR cache on results.
 */

const { URL } = require("url");
const { isIP } = require("net");
const dns = require("dns").promises;
const { fetchWithTimeout } = require("../helpers/fetchWithTimeout");
const { createCircuitBreaker } = require("./circuitBreaker");
const { withCache, clearCache } = require("./cache");

const env = typeof process !== "undefined" ? process.env : {};

const ALLOW_PRIVATE = env.RESEARCH_ALLOW_PRIVATE_NETWORKS === "true";
const STRICT_SSRF = env.RESEARCH_STRICT_SSRF === "true";
const MAX_REDIRECTS = 3;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024; // 2 MB

const extractorBreaker = createCircuitBreaker("content-extractor");

function resetAll() {
  extractorBreaker.reset();
  clearCache();
}

// RFC 1918 + loopback + link-local + CGNAT + carrier-grade NAT ranges
const PRIVATE_RANGES = [
  { net: "10.0.0.0", bits: 8 }, // 10.0.0.0/8
  { net: "172.16.0.0", bits: 12 }, // 172.16.0.0/12
  { net: "192.168.0.0", bits: 16 }, // 192.168.0.0/16
  { net: "127.0.0.0", bits: 8 }, // loopback
  { net: "169.254.0.0", bits: 16 }, // link-local
  { net: "0.0.0.0", bits: 8 }, // current network
  { net: "100.64.0.0", bits: 10 }, // CGNAT (RFC 6598)
  { net: "198.18.0.0", bits: 15 }, // benchmark (RFC 2544)
];

function ipv4ToInt(ip) {
  const octets = ip.split(".").map(Number);
  return (
    ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0
  );
}

function isPrivateIPv4(ip) {
  if (isIP(ip) !== 4) return false;
  const addr = ipv4ToInt(ip);
  for (const range of PRIVATE_RANGES) {
    const net = ipv4ToInt(range.net);
    const mask = ~((1 << (32 - range.bits)) - 1);
    if ((addr & mask) === (net & mask)) return true;
  }
  return false;
}

function isPrivateHostname(hostname) {
  return (
    hostname === "localhost" ||
    hostname === "localhost.localdomain" ||
    hostname.endsWith(".local")
  );
}

function parseUrl(raw) {
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  return parsed;
}

class ContentExtractor {
  /**
   * Extract content from a URL with SSRF protections.
   * @param {string} url
   * @param {number} [redirectCount=0] - internal; tracks redirect depth
   * @returns {Promise<string|null>}
   */
  static async extract(url, redirectCount = 0) {
    if (redirectCount === 0) {
      return withCache(
        `extract:${url}`,
        () => ContentExtractor.#doExtract(url, 0),
        60_000,
      );
    }
    return ContentExtractor.#doExtract(url, redirectCount);
  }

  static async #doExtract(url, redirectCount) {
    if (redirectCount > MAX_REDIRECTS) return null;

    const parsed = parseUrl(url);
    if (!parsed) return null;

    // Skip private hostnames early
    if (isPrivateHostname(parsed.hostname) && !ALLOW_PRIVATE) return null;

    // Validate IP if hostname is literal
    if (isIP(parsed.hostname)) {
      if (isPrivateIPv4(parsed.hostname) && !ALLOW_PRIVATE) return null;
    }

    // Strict mode: resolve DNS and check resolved IPs against private ranges
    if (STRICT_SSRF && !isIP(parsed.hostname)) {
      try {
        const addresses = await dns.resolve4(parsed.hostname);
        for (const addr of addresses) {
          if (isPrivateIPv4(addr) && !ALLOW_PRIVATE) return null;
        }
      } catch {
        // DNS failure → treat as unreachable
        return null;
      }
    }

    try {
      const res = await extractorBreaker.call(() =>
        fetchWithTimeout(
          parsed.href,
          {
            headers: {
              "User-Agent": "OpenSIN-Chat/1.0 (Research Pipeline)",
              Accept: "text/html,text/plain,application/json",
            },
            redirect: "manual",
          },
          15000,
        ),
      );

      // Follow redirects manually with hop limit
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        if (!location) return null;
        let nextUrl;
        try {
          nextUrl = new URL(location, parsed.href).href;
        } catch {
          return null;
        }
        return ContentExtractor.extract(nextUrl, redirectCount + 1);
      }

      if (!res.ok) return null;

      // Enforce response size limit
      const contentLength = res.headers.get("content-length");
      if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_BYTES)
        return null;

      const contentType = res.headers.get("content-type") || "";

      // Read body with size cap
      const text = await ContentExtractor.#readWithLimit(
        res,
        MAX_RESPONSE_BYTES,
      );
      if (text === null) return null;

      if (contentType.includes("application/json")) {
        try {
          const json = JSON.parse(text);
          return JSON.stringify(json, null, 2).substring(0, 10000);
        } catch {
          return null;
        }
      }

      if (contentType.includes("text/plain")) {
        return text.substring(0, 10000);
      }

      if (contentType.includes("text/html")) {
        return ContentExtractor.#htmlToText(text).substring(0, 10000);
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Read a response body with an explicit byte cap.
   * @param {Response} res - fetch Response
   * @param {number} maxBytes
   * @returns {Promise<string|null>}
   */
  static async #readWithLimit(res, maxBytes) {
    if (!res.body) return null;
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let result = "";
    let total = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.length;
        if (total > maxBytes) {
          reader.cancel();
          return null;
        }
        result += decoder.decode(value, { stream: true });
      }
      result += decoder.decode();
    } catch {
      reader.cancel();
      return null;
    } finally {
      reader.releaseLock();
    }

    return result;
  }

  /**
   * Basic HTML to text conversion (no DOM parser needed for worker processes).
   * @param {string} html
   * @returns {string}
   */
  static #htmlToText(html) {
    let text = html;

    text = text.replace(/<script[\s\S]*?<\/script>/gi, "");
    text = text.replace(/<style[\s\S]*?<\/style>/gi, "");
    text = text.replace(/<nav[\s\S]*?<\/nav>/gi, "");
    text = text.replace(/<footer[\s\S]*?<\/footer>/gi, "");
    text = text.replace(/<header[\s\S]*?<\/header>/gi, "");

    text = text.replace(/<br\s*\/?>/gi, "\n");
    text = text.replace(/<\/p>/gi, "\n\n");
    text = text.replace(/<\/h[1-6]>/gi, "\n\n");
    text = text.replace(/<\/li>/gi, "\n");
    text = text.replace(/<\/div>/gi, "\n");

    text = text.replace(/<[^>]+>/g, "");

    text = text.replace(/&amp;/g, "&");
    text = text.replace(/&lt;/g, "<");
    text = text.replace(/&gt;/g, ">");
    text = text.replace(/&quot;/g, '"');
    text = text.replace(/&#39;/g, "'");
    text = text.replace(/&nbsp;/g, " ");

    text = text.replace(/\n{3,}/g, "\n\n");
    text = text.trim();

    return text;
  }
}

module.exports = { ContentExtractor, resetAll };
