// SPDX-License-Identifier: MIT
const { v4 } = require("uuid");
const { parse } = require("node-html-parser");
const { writeToServerDocuments, documentsFolder } = require("../../files");
const { tokenizeString } = require("../../tokenizer");
const path = require("path");
const fs = require("fs");
const { default: slugify } = require("slugify");
const { browserPool } = require("../../browserPool");

const MAX_RESPONSE_BYTES = 50 * 1024 * 1024;
const PUPPETEER_TIMEOUT_MS = 60_000;

async function discoverLinks(startUrl, maxDepth = 1, maxLinks = 20) {
  const baseUrl = new URL(startUrl);
  const discoveredLinks = new Set([startUrl]);
  let queue = [[startUrl, 0]];
  const scrapedUrls = new Set();

  for (let currentDepth = 0; currentDepth < maxDepth; currentDepth++) {
    const levelSize = queue.length;
    const nextQueue = [];

    for (let i = 0; i < levelSize && discoveredLinks.size < maxLinks; i++) {
      const [currentUrl, urlDepth] = queue[i];

      if (!scrapedUrls.has(currentUrl)) {
        scrapedUrls.add(currentUrl);
        const newLinks = await getPageLinks(currentUrl, baseUrl);

        for (const link of newLinks) {
          if (!discoveredLinks.has(link) && discoveredLinks.size < maxLinks) {
            discoveredLinks.add(link);
            if (urlDepth + 1 < maxDepth) {
              nextQueue.push([link, urlDepth + 1]);
            }
          }
        }
      }
    }

    queue = nextQueue;
    if (queue.length === 0 || discoveredLinks.size >= maxLinks) break;
  }

  return Array.from(discoveredLinks);
}

async function getPageLinks(url, baseUrl) {
  const browser = await browserPool.acquire();
  let page = null;
  try {
    page = await browser.newPage();
    await page.goto(url, {
      timeout: PUPPETEER_TIMEOUT_MS,
      waitUntil: "networkidle2",
    });
    const html = await page.evaluate(() => document.documentElement.outerHTML);
    if (Buffer.byteLength(html, "utf8") > MAX_RESPONSE_BYTES) return [];
    return extractLinks(html, baseUrl);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Failed to get page links from ${url}.`, error);
    return [];
  } finally {
    if (page) await page.close().catch((e) => console.warn("[index] non-fatal error:", e?.message || e));
    await browserPool.release(browser);
  }
}

function extractLinks(html, baseUrl) {
  const root = parse(html);
  const links = root.querySelectorAll("a");
  const extractedLinks = new Set();

  const basePath = baseUrl.pathname.endsWith("/")
    ? baseUrl.pathname.slice(0, -1)
    : baseUrl.pathname;

  for (const link of links) {
    const href = link.getAttribute("href");
    if (!href) continue;
    try {
      const resolved = new URL(href, baseUrl.href);
      if (resolved.hostname !== baseUrl.hostname) continue;
      if (
        basePath &&
        !resolved.pathname.startsWith(basePath + "/") &&
        resolved.pathname !== basePath
      )
        continue;
      extractedLinks.add(resolved.href);
    } catch {
      continue;
    }
  }

  return Array.from(extractedLinks);
}

async function bulkScrapePages(links, outFolderPath) {
  const scrapedData = [];

  for (let i = 0; i < links.length; i++) {
    const link = links[i];
    // eslint-disable-next-line no-console
    console.log(`Scraping ${i + 1}/${links.length}: ${link}`);

    const browser = await browserPool.acquire();
    let page = null;
    try {
      page = await browser.newPage();
      await page.goto(link, {
        timeout: PUPPETEER_TIMEOUT_MS,
        waitUntil: "networkidle2",
      });
      const content = await page.evaluate(() => document.body.innerText);

      if (!content?.length) {
        // eslint-disable-next-line no-console
        console.warn(`Empty content for ${link}. Skipping.`);
        continue;
      }

      const url = new URL(link);
      let decodedPathname;
      try {
        decodedPathname = decodeURIComponent(url.pathname);
      } catch {
        decodedPathname = url.pathname;
      }
      const filename = `${url.hostname}${decodedPathname.replace(/\//g, "_")}`;

      const data = {
        id: v4(),
        url: "file://" + slugify(filename) + ".html",
        title: slugify(filename) + ".html",
        docAuthor: "no author found",
        description: "No description found.",
        docSource: "URL link uploaded by the user.",
        chunkSource: `link://${link}`,
        published: new Date().toLocaleString(),
        wordCount: content.split(/\s+/).filter(Boolean).length,
        pageContent: content,
        token_count_estimate: tokenizeString(content),
      };

      writeToServerDocuments({
        data,
        filename: data.title,
        destinationOverride: outFolderPath,
      });
      scrapedData.push(data);

      // eslint-disable-next-line no-console
      console.log(`Successfully scraped ${link}.`);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Failed to scrape ${link}.`, error);
    } finally {
      if (page) await page.close().catch((e) => console.warn("[index] non-fatal error:", e?.message || e));
      await browserPool.release(browser);
    }
  }

  return scrapedData;
}

async function websiteScraper(startUrl, depth = 1, maxLinks = 20) {
  const websiteName = new URL(startUrl).hostname;
  const outFolder = slugify(
    `${slugify(websiteName)}-${v4().slice(0, 4)}`
  ).toLowerCase();
  const outFolderPath = path.resolve(documentsFolder, outFolder);
  // eslint-disable-next-line no-console
  console.log("Discovering links...");
  const linksToScrape = await discoverLinks(startUrl, depth, maxLinks);
  // eslint-disable-next-line no-console
  console.log(`Found ${linksToScrape.length} links to scrape.`);

  if (!fs.existsSync(outFolderPath))
    fs.mkdirSync(outFolderPath, { recursive: true });
  // eslint-disable-next-line no-console
  console.log("Starting bulk scraping...");
  const scrapedData = await bulkScrapePages(linksToScrape, outFolderPath);
  // eslint-disable-next-line no-console
  console.log(`Scraped ${scrapedData.length} pages.`);

  return scrapedData;
}

module.exports = websiteScraper;
