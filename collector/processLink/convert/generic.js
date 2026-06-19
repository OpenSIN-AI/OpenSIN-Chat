// SPDX-License-Identifier: MIT
const { v4 } = require("uuid");
const {
  PuppeteerWebBaseLoader,
} = require("@langchain/community/document_loaders/web/puppeteer");
const { writeToServerDocuments } = require("../../utils/files");
const { tokenizeString } = require("../../utils/tokenizer");
const { default: slugify } = require("slugify");
const {
  returnResult,
  determineContentType,
  processAsFile,
} = require("../helpers");
const {
  loadYouTubeTranscript,
} = require("../../utils/extensions/YoutubeTranscript");
const RuntimeSettings = require("../../utils/runtimeSettings");
const { htmlToMarkdown } = require("../helpers/htmlToMarkdown");
const { browserPool } = require("../../utils/browserPool");

const MAX_RESPONSE_BYTES = 50 * 1024 * 1024;
const PUPPETEER_TIMEOUT_MS = 60_000;

/**
 * Scrape a generic URL and return the content in the specified format
 * @param {Object} config - The configuration object
 * @param {string} config.link - The URL to scrape
 * @param {('html' | 'text')} config.captureAs - The format to capture the page content as. Default is 'text'
 * @param {{[key: string]: string}} config.scraperHeaders - Custom headers to use when making the request
 * @param {{[key: string]: string}} config.metadata - Metadata to use when creating the document
 * @param {boolean} config.saveAsDocument - Whether to save the content as a document. Default is true
 * @returns {Promise<Object>} - The content of the page
 */
async function scrapeGenericUrl({
  link,
  captureAs = "text",
  scraperHeaders = {},
  metadata = {},
  saveAsDocument = true,
}) {
  /** @type {'web' | 'file' | 'youtube'} */
  // eslint-disable-next-line no-console
  console.log(`-- Working URL ${link} => (captureAs: ${captureAs}) --`);
  let { contentType, processVia } = await determineContentType(link);
  // eslint-disable-next-line no-console
  console.log(`-- URL determined to be ${contentType} (${processVia}) --`);

  /**
   * When the content is a file or a YouTube video, we can use the existing processing functions
   * These are self-contained and will return the correct response based on the saveAsDocument flag already
   * so we can return the content immediately.
   */
  if (processVia === "file")
    return await processAsFile({ uri: link, saveAsDocument });
  else if (processVia === "youtube")
    return await loadYouTubeTranscript(
      { url: link },
      { parseOnly: saveAsDocument === false }
    );

  // Otherwise, assume the content is a webpage and scrape the content from the webpage
  const content = await getPageContent({
    link,
    captureAs,
    headers: scraperHeaders,
  });
  if (!content || !content.length) {
    // eslint-disable-next-line no-console
    console.error(`Resulting URL content was empty at ${link}.`);
    return returnResult({
      success: false,
      reason: `No URL content found at ${link}.`,
      documents: [],
      content: null,
      saveAsDocument,
    });
  }

  // If the captureAs is text, return the content as a string immediately
  // so that we dont save the content as a document
  if (!saveAsDocument)
    return returnResult({
      success: true,
      content,
      saveAsDocument,
    });

  // Save the content as a document from the URL
  const url = new URL(link);
  const decodedPathname = decodeURIComponent(url.pathname);
  const filename = `${url.hostname}${decodedPathname.replace(/\//g, "_")}`;
  const data = {
    id: v4(),
    url: "file://" + slugify(filename) + ".html",
    title: metadata.title || slugify(filename) + ".html",
    docAuthor: metadata.docAuthor || "no author found",
    description: metadata.description || "No description found.",
    docSource: metadata.docSource || "URL link uploaded by the user.",
    chunkSource: `link://${link}`,
    published: new Date().toLocaleString(),
    wordCount: content.split(/\s+/).filter(Boolean).length,
    pageContent: content,
    token_count_estimate: tokenizeString(content),
  };

  const document = writeToServerDocuments({
    data,
    filename: `url-${slugify(filename)}-${data.id}`,
  });
  // eslint-disable-next-line no-console
  console.log(`[SUCCESS]: URL ${link} converted & ready for embedding.\n`);
  return { success: true, reason: null, documents: [document] };
}

/**
 * Validate the headers object
 * - Keys & Values must be strings and not empty
 * - Assemble a new object with only the valid keys and values
 * @param {{[key: string]: string}} headers - The headers object to validate
 * @returns {{[key: string]: string}} - The validated headers object
 */
function validatedHeaders(headers = {}) {
  try {
    if (Object.keys(headers).length === 0) return {};
    let validHeaders = {};
    for (const key of Object.keys(headers)) {
      if (!key?.trim()) continue;
      if (typeof headers[key] !== "string" || !headers[key]?.trim()) continue;
      validHeaders[key] = headers[key].trim();
    }
    return validHeaders;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error validating headers", error);
    return {};
  }
}

/**
 * Get the content of a page
 * @param {Object} config - The configuration object
 * @param {string} config.link - The URL to get the content of
 * @param {('html' | 'text')} config.captureAs - The format to capture the page content as. Default is 'text'
 * @param {{[key: string]: string}} config.headers - Custom headers to use when making the request
 * @returns {Promise<string>} - The content of the page
 */
async function getPageContent({ link, captureAs = "text", headers = {} }) {
  const runtimeSettings = new RuntimeSettings();
  const overrideHeaders = validatedHeaders(headers);
  const hasHeaders = Object.keys(overrideHeaders).length > 0;
  let docs = [];

  try {
    const launchConfig = { headless: "new" };
    if (
      process.platform === "darwin" &&
      process.env.NODE_ENV === "development"
    ) {
      // eslint-disable-next-line no-console
      console.log(
        "Darwin Development Mode: Disabling headless mode to prevent Chromium from crashing."
      );
      launchConfig.headless = "false";
    }

    const capResponseBytes = async (response) => {
      const contentLength = parseInt(
        response.headers()?.["content-length"] || "0",
        10
      );
      if (contentLength > MAX_RESPONSE_BYTES) {
        throw new Error(
          `Response too large (Content-Length ${contentLength} > ${MAX_RESPONSE_BYTES})`
        );
      }
      return response;
    };

    const MAX_REDIRECT_DEPTH = 5;
    const MAX_META_REFRESH_DEPTH = 3;
    const redirectUrls = new Set();
    let metaDepth = 0;

    const scrapeWithPool = async (entryLink) => {
      const browser = await browserPool.acquire();
      let page = null;
      try {
        page = await browser.newPage();
        if (hasHeaders) await page.setExtraHTTPHeaders(overrideHeaders);

        await page.setRequestInterception(true);
        const onRequest = (req) => {
          if (page && !page.isClosed()) {
            try {
              req.continue();
            } catch {}
          } else {
            try {
              req.abort();
            } catch {}
          }
        };
        page.on("request", onRequest);

        const gotoOptions = {
          timeout: Math.min(PUPPETEER_TIMEOUT_MS, 30_000),
          waitUntil: "domcontentloaded",
        };
        let response = null;
        try {
          response = await page.goto(entryLink, gotoOptions);
        } catch (navErr) {
          if (navErr.message?.includes("ERR_TOO_MANY_REDIRECTS")) {
            throw new Error(`Too many redirects for ${entryLink}`);
          }
          throw navErr;
        }
        const res = await capResponseBytes(response);
        if (!res || !res.ok())
          throw new Error(`HTTP ${res?.status?.() ?? "?"} on ${entryLink}`);

        let originalContent = await page.content();
        let renderedBytes = Buffer.byteLength(originalContent, "utf8");

        while (
          metaDepth < MAX_META_REFRESH_DEPTH &&
          renderedBytes <= MAX_RESPONSE_BYTES
        ) {
          const meta = extractMetaRefresh(originalContent);
          if (!meta) break;
          if (redirectUrls.has(meta)) {
            // Loop detected — stop here.
            break;
          }
          redirectUrls.add(meta);
          metaDepth += 1;
          try {
            await page.goto(meta, { timeout: 10_000, waitUntil: "load" });
            originalContent = await page.content();
            renderedBytes = Buffer.byteLength(originalContent, "utf8");
          } catch {
            break;
          }
        }

        if (redirectUrls.size > MAX_REDIRECT_DEPTH) {
          throw new Error(
            `Redirect chain exceeded ${MAX_REDIRECT_DEPTH} hops for ${link}`
          );
        }
        if (renderedBytes > MAX_RESPONSE_BYTES) {
          throw new Error(
            `Rendered page exceeds ${MAX_RESPONSE_BYTES} bytes (got ${renderedBytes})`
          );
        }
        return { pageContent: originalContent };
      } finally {
        if (page) await page.close().catch(() => {});
        await browserPool.release(browser);
      }
    };

    const scrapeWithCustomLoader = async () => {
      const loader = new PuppeteerWebBaseLoader(link, {
        launchOptions: {
          headless: launchConfig.headless,
          ignoreHTTPSErrors: true,
          args: runtimeSettings.get("browserLaunchArgs"),
        },
        gotoOptions: {
          timeout: Math.min(PUPPETEER_TIMEOUT_MS, 30_000),
          waitUntil: "domcontentloaded",
        },
        async evaluate(page, _browser) {
          const innerHTML = await page.evaluate(
            () => document.documentElement.innerHTML
          );
          if (Buffer.byteLength(innerHTML, "utf8") > MAX_RESPONSE_BYTES)
            throw new Error(
              `Rendered page exceeds ${MAX_RESPONSE_BYTES} bytes`
            );
          if (captureAs === "html") return innerHTML;
          return htmlToMarkdown(innerHTML, link);
        },
      });
      if (hasHeaders) {
        loader.scrape = async function () {
          const { launch } = await PuppeteerWebBaseLoader.imports();
          const browser = await launch({
            headless: "new",
            defaultViewport: null,
            ignoreDefaultArgs: ["--disable-extensions"],
            ...this.options?.launchOptions,
          });
          try {
            const page = await browser.newPage();
            await page.setExtraHTTPHeaders(overrideHeaders);

            try {
              await page.goto(this.webPath, {
                timeout: Math.min(PUPPETEER_TIMEOUT_MS, 30_000),
                waitUntil: "domcontentloaded",
                ...this.options?.gotoOptions,
              });
            } catch (navErr) {
              if (navErr.message?.includes("ERR_TOO_MANY_REDIRECTS"))
                throw new Error(`Too many redirects for ${this.webPath}`);
              throw navErr;
            }

            const bodyHTML = this.options?.evaluate
              ? await this.options.evaluate(page, browser)
              : await page.evaluate(() => document.body.innerHTML);

            if (Buffer.byteLength(bodyHTML, "utf8") > MAX_RESPONSE_BYTES)
              throw new Error(
                `Rendered page exceeds ${MAX_RESPONSE_BYTES} bytes`
              );
            return bodyHTML;
          } finally {
            await browser.close();
          }
        };
      }
      const loadedDocs = await loader.load();
      docs = Array.isArray(loadedDocs) ? loadedDocs : [];
    };

    if (hasHeaders) {
      await scrapeWithCustomLoader();
    } else {
      const scrapedDoc = await scrapeWithPool();
      docs = [scrapedDoc];
    }

    if (captureAs !== "html" && docs.length) {
      docs = docs.map((d) => ({
        pageContent: d?.pageContent ? htmlToMarkdown(d.pageContent, link) : "",
      }));
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(
      "getPageContent failed to be fetched by puppeteer - falling back to fetch!",
      error
    );
    docs = [];
  }

  if (docs.length) {
    const pageContents = docs.map((d) => d?.pageContent).filter(Boolean);
    if (pageContents.length) return pageContents.join(" ");
  }

  try {
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), 15_000);
    const visited = new Set();
    let currentLink = link;
    let hops = 0;
    const MAX_FETCH_HOPS = 5;
    try {
      let response = null;
      while (hops <= MAX_FETCH_HOPS) {
        if (visited.has(currentLink)) {
          throw new Error(`Redirect loop detected for ${link}`);
        }
        visited.add(currentLink);
        response = await fetch(currentLink, {
          method: "GET",
          redirect: "manual",
          headers: {
            "Content-Type": "text/plain",
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36,gzip(gfe)",
            ...validatedHeaders(headers),
          },
          signal: abortController.signal,
        });
        if (
          response.status >= 300 &&
          response.status < 400 &&
          response.headers.get("location")
        ) {
          const next = new URL(
            response.headers.get("location"),
            currentLink
          ).toString();
          currentLink = next;
          hops += 1;
          continue;
        }
        break;
      }
      if (!response || !response.ok)
        throw new Error(`HTTP ${response?.status}`);
      const contentLength = parseInt(
        response.headers.get("content-length") || "0",
        10
      );
      if (contentLength > MAX_RESPONSE_BYTES)
        throw new Error(
          `Response too large (Content-Length ${contentLength} > ${MAX_RESPONSE_BYTES})`
        );
      const pageText = await response.text();
      if (Buffer.byteLength(pageText, "utf8") > MAX_RESPONSE_BYTES)
        throw new Error(`Response body exceeds ${MAX_RESPONSE_BYTES} bytes`);
      return htmlToMarkdown(pageText, link);
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("getPageContent failed to be fetched by any method.", error);
  }

  return null;
}

const META_REFRESH_REGEX =
  /<meta[^>]*http-equiv\s*=\s*["']?refresh["']?[^>]*content\s*=\s*["']?\s*\d+\s*;\s*url\s*=\s*([^"'>\s]+)/i;

function extractMetaRefresh(html = "") {
  if (!html) return null;
  const match = html.match(META_REFRESH_REGEX);
  if (!match) return null;
  try {
    return new URL(match[1], "").toString();
  } catch {
    return null;
  }
}

module.exports = {
  scrapeGenericUrl,
};
