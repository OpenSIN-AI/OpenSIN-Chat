// SPDX-License-Identifier: MIT
/**
 * browser-vision agent plugin
 *
 * Provides two agent-callable tools that enable structured inspection of
 * web pages without requiring a running browser process in CI:
 *
 *   1. fetch-page-text  — fetches a URL and returns cleaned text content
 *                         (links, headings, body text, meta description).
 *                         Suitable for reading articles, documentation, and
 *                         public data pages.
 *
 *   2. fetch-page-meta  — returns lightweight metadata for a URL:
 *                         title, description, Open Graph tags, canonical URL,
 *                         and primary outbound links. Does not download the
 *                         full page body, making it fast and token-efficient.
 *
 * When AGENT_BROWSER_VISION_PLAYWRIGHT=true is set in the environment AND
 * the optional `playwright` package is installed, the plugin upgrades to a
 * headless Chromium render for JavaScript-rendered pages. Without it the
 * plugin falls back cleanly to plain HTTP fetch + HTML parsing, which covers
 * the vast majority of public-facing pages including Bundestag, Wikipedia, and
 * news sites.
 *
 * Docs:   browser-vision.doc.md
 * Issues: #8 (Browser Agent Integration), #20 (SIN Browser Vision Tools)
 */

const { TokenManager } = require("../../../helpers/tiktoken");
const { validateUrl } = require("../../../ssrf");
const tiktoken = new TokenManager();

// ── HTML parsing helpers ──────────────────────────────────────────────────────

/**
 * Strip HTML tags, collapse whitespace, and decode common HTML entities.
 * @param {string} html
 * @returns {string}
 */
function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Extract the value of a <meta> tag by name or property.
 * @param {string} html
 * @param {string} nameOrProp
 * @returns {string|null}
 */
function extractMeta(html, nameOrProp) {
  const re = new RegExp(
    `<meta[^>]+(?:name|property)=["']${nameOrProp}["'][^>]+content=["']([^"']+)["']`,
    "i",
  );
  const m = html.match(re);
  if (m) return m[1];

  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${nameOrProp}["']`,
    "i",
  );
  const m2 = html.match(re2);
  return m2 ? m2[1] : null;
}

/**
 * Extract the page <title>.
 * @param {string} html
 * @returns {string|null}
 */
function extractTitle(html) {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? m[1].trim() : null;
}

/**
 * Extract all headings (h1–h3) in order.
 * @param {string} html
 * @returns {string[]}
 */
function extractHeadings(html) {
  const headings = [];
  const re = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const text = stripHtml(m[1]).trim();
    if (text) headings.push(text);
  }
  return headings;
}

/**
 * Extract anchor hrefs that look like absolute URLs.
 * @param {string} html
 * @param {string} baseUrl - used to resolve relative links
 * @param {number} [limit=20]
 * @returns {string[]}
 */
function extractLinks(html, baseUrl, limit = 20) {
  const links = [];
  const re = /<a[^>]+href=["']([^"'#]+)["'][^>]*>/gi;
  let m;
  const base = new URL(baseUrl);

  while ((m = re.exec(html)) !== null && links.length < limit) {
    const href = m[1].trim();
    try {
      const abs = new URL(href, base).toString();
      if (!links.includes(abs)) links.push(abs);
    } catch {
      // skip malformed hrefs
    }
  }
  return links;
}

// ── HTTP fetch with retries ───────────────────────────────────────────────────

const FETCH_TIMEOUT_MS = 15_000;
const MAX_FETCH_RETRIES = 2;

/**
 * Fetch a URL with a timeout and simple retry logic.
 * @param {string} url
 * @returns {Promise<{html: string, finalUrl: string}>}
 */
async function fetchWithRetry(url) {
  validateUrl(url);
  let lastErr;
  for (let attempt = 1; attempt <= MAX_FETCH_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; OpenSIN-BrowserVision/1.0; +https://openafd.de)",
          Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
          "Accept-Language": "de,en;q=0.7",
        },
        redirect: "follow",
      });
      clearTimeout(timer);

      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("html") && !contentType.includes("text")) {
        throw new Error(
          `Unsupported content-type: ${contentType}. Only HTML/text pages are supported.`,
        );
      }

      const html = await res.text();
      return { html, finalUrl: res.url || url };
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      if (attempt < MAX_FETCH_RETRIES) {
        await new Promise((r) => setTimeout(r, 800 * attempt));
      }
    }
  }
  throw lastErr;
}

/**
 * Optionally render with Playwright if available and opted-in.
 * Falls back silently to plain fetch.
 * @param {string} url
 * @returns {Promise<{html: string, finalUrl: string}>}
 */
async function fetchHtml(url) {
  validateUrl(url);
  if (process.env.AGENT_BROWSER_VISION_PLAYWRIGHT === "true") {
    let browser;
    try {
      const { chromium } = require("playwright");
      const launchArgs = [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--no-zygote",
        "--single-process",
      ];
      if (process.env.NODE_ENV === "production") {
        launchArgs.push(
          "--enable-features=UseOzonePlatform",
          "--ozone-platform=headless",
        );
      }
      browser = await chromium.launch({ headless: true, args: launchArgs });
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20_000 });
      const html = await page.content();
      const finalUrl = page.url();
      return { html, finalUrl };
    } catch {
      // Playwright not installed or launch failed — fall through to fetch
    } finally {
      if (browser) await browser.close().catch(() => {});
    }
  }
  return fetchWithRetry(url);
}

// ── Token truncation ──────────────────────────────────────────────────────────

const MAX_TEXT_TOKENS = 3000;

/**
 * Truncate text to roughly MAX_TEXT_TOKENS tokens by character approximation.
 * @param {string} text
 * @returns {string}
 */
function truncateToTokenLimit(text) {
  // Rough approximation: 1 token ≈ 4 chars
  const maxChars = MAX_TEXT_TOKENS * 4;
  if (text.length <= maxChars) return text;
  return (
    text.slice(0, maxChars) +
    `\n\n[... truncated at ~${MAX_TEXT_TOKENS} tokens]`
  );
}

// ── Plugin definition ─────────────────────────────────────────────────────────

const browserVision = {
  name: "browser-vision",
  startupConfig: {
    params: {},
  },
  plugin: function () {
    return {
      name: this.name,
      setup(aibitat) {
        // ── Tool 1: fetch-page-text ──────────────────────────────────────────
        aibitat.function({
          super: aibitat,
          name: "fetch-page-text",
          description:
            "Fetch the full readable text content of a web page by URL. " +
            "Use this to read articles, documentation pages, political speeches, " +
            "Wikipedia entries, Bundestag protocols, or any public HTML page. " +
            "Returns cleaned text with headings and body content. " +
            "Do NOT use this for search — use web-browsing for search.",
          examples: [
            {
              prompt: "Read the Bundestag press release at this URL",
              call: JSON.stringify({
                url: "https://www.bundestag.de/presse/pressemitteilungen/example",
              }),
            },
            {
              prompt: "What does the Wikipedia article about AfD say?",
              call: JSON.stringify({
                url: "https://de.wikipedia.org/wiki/Alternative_f%C3%BCr_Deutschland",
              }),
            },
          ],
          parameters: {
            $schema: "http://json-schema.org/draft-07/schema#",
            type: "object",
            required: ["url"],
            properties: {
              url: {
                type: "string",
                format: "uri",
                description: "A complete URL (including https://) to fetch.",
              },
              selector: {
                type: "string",
                description:
                  "Optional CSS selector to narrow extraction to a specific element. " +
                  "Only applied when Playwright is available.",
              },
            },
            additionalProperties: false,
          },
          handler: async function ({ url, selector: _selector }) {
            try {
              this.super.introspect(
                `${this.caller}: Fetching page text from ${url} ...`,
              );

              const { html, finalUrl } = await fetchHtml(url);
              const title = extractTitle(html);
              const headings = extractHeadings(html);

              // Extract body text — prefer <main> or <article>, fall back to <body>
              const bodyMatch =
                html.match(/<main[^>]*>([\s\S]*?)<\/main>/i) ||
                html.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
                html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);

              const bodyText = bodyMatch
                ? stripHtml(bodyMatch[1])
                : stripHtml(html);

              const result = [
                title ? `# ${title}` : "",
                finalUrl !== url ? `URL: ${finalUrl}` : "",
                headings.length > 0
                  ? `\n## Headings\n${headings.slice(0, 10).join("\n")}`
                  : "",
                `\n## Content\n${bodyText}`,
              ]
                .filter(Boolean)
                .join("\n");

              const truncated = truncateToTokenLimit(result);
              const tokenCount = tiktoken
                .countFromString(truncated)
                .toString()
                .replace(/\B(?=(\d{3})+(?!\d))/g, ",");

              this.super.introspect(
                `${this.caller}: Page fetched — ${tokenCount} tokens of content.`,
              );

              this.super.addCitation?.([
                {
                  id: finalUrl,
                  title: title || finalUrl,
                  text: headings.slice(0, 3).join(" | "),
                  chunkSource: `link://${finalUrl}`,
                  score: null,
                },
              ]);

              return truncated;
            } catch (err) {
              this.super.handlerProps?.log(
                `[browser-vision] fetch-page-text error: ${err.message}`,
              );
              return `Could not fetch the page. Error: ${err.message}`;
            }
          },
        });

        // ── Tool 2: fetch-page-meta ──────────────────────────────────────────
        aibitat.function({
          super: aibitat,
          name: "fetch-page-meta",
          description:
            "Fetch lightweight metadata for a URL: page title, description, " +
            "Open Graph data, canonical URL, and top outbound links. " +
            "Much faster and cheaper than fetch-page-text. " +
            "Use this to quickly understand what a page is about before deciding " +
            "whether to read the full content.",
          examples: [
            {
              prompt: "What is this page about? https://www.bundestag.de",
              call: JSON.stringify({ url: "https://www.bundestag.de" }),
            },
            {
              prompt: "Check the meta information of openafd.de",
              call: JSON.stringify({ url: "https://openafd.de" }),
            },
          ],
          parameters: {
            $schema: "http://json-schema.org/draft-07/schema#",
            type: "object",
            required: ["url"],
            properties: {
              url: {
                type: "string",
                format: "uri",
                description: "A complete URL to inspect.",
              },
            },
            additionalProperties: false,
          },
          handler: async function ({ url }) {
            try {
              this.super.introspect(
                `${this.caller}: Fetching page metadata from ${url} ...`,
              );

              validateUrl(url);

              // Only fetch the first 32 KB of the page to get <head> quickly
              const controller = new AbortController();
              const timer = setTimeout(
                () => controller.abort(),
                FETCH_TIMEOUT_MS,
              );
              let res;
              try {
                res = await fetch(url, {
                  signal: controller.signal,
                  headers: {
                    "User-Agent":
                      "Mozilla/5.0 (compatible; OpenSIN-BrowserVision/1.0)",
                    Accept: "text/html,*/*;q=0.5",
                  },
                });
              } finally {
                clearTimeout(timer);
              }

              // Read first 32 KB only
              const reader = res.body?.getReader();
              let html = "";
              if (reader) {
                const decoder = new TextDecoder();
                try {
                  let received = 0;
                  while (received < 32768) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    html += decoder.decode(value, { stream: true });
                    received += value?.length ?? 0;
                  }
                } finally {
                  await reader.cancel().catch(() => {});
                }
              } else {
                html = await res.text();
              }

              const finalUrl = res.url || url;
              const title =
                extractMeta(html, "og:title") ||
                extractTitle(html) ||
                "(no title)";
              const description =
                extractMeta(html, "og:description") ||
                extractMeta(html, "description") ||
                "(no description)";
              const canonical =
                html.match(
                  /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i,
                )?.[1] || finalUrl;
              const ogImage = extractMeta(html, "og:image");
              const ogType = extractMeta(html, "og:type");
              const links = extractLinks(html, finalUrl, 10);

              const meta = {
                title,
                description,
                canonical,
                ogType,
                ogImage,
                finalUrl,
                topLinks: links,
              };

              this.super.addCitation?.([
                {
                  id: finalUrl,
                  title,
                  text: description,
                  chunkSource: `link://${finalUrl}`,
                  score: null,
                },
              ]);

              return JSON.stringify(meta, null, 2);
            } catch (err) {
              this.super.handlerProps?.log(
                `[browser-vision] fetch-page-meta error: ${err.message}`,
              );
              return `Could not fetch page metadata. Error: ${err.message}`;
            }
          },
        });
      },
    };
  },
};

module.exports = { browserVision };
