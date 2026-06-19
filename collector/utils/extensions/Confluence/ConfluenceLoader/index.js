// SPDX-License-Identifier: MIT
/*
 * This is a custom implementation of the Confluence langchain loader. There was an issue where
 * code blocks were not being extracted. This is a temporary fix until this issue is resolved.*/

const { htmlToText } = require("html-to-text");

class ConfluencePagesLoader {
  constructor({
    baseUrl,
    spaceKey,
    username,
    accessToken,
    limit = 25,
    expand = "body.storage,version",
    personalAccessToken,
    cloud = true,
    bypassSSL = false,
  }) {
    this.baseUrl = baseUrl;
    this.spaceKey = spaceKey;
    this.username = username;
    this.accessToken = accessToken;
    this.limit = limit;
    this.expand = expand;
    this.personalAccessToken = personalAccessToken;
    this.cloud = cloud;
    this.bypassSSL = bypassSSL;
    this.maxRetries = 3;
    this.log("Initialized Confluence Loader");
    if (this.bypassSSL)
      this.log("!!SSL bypass is enabled!! Use at your own risk!!");
  }

  log(message, ...args) {
    // eslint-disable-next-line no-console
    console.log(`\x1b[36m[Confluence Loader]\x1b[0m ${message}`, ...args);
  }

  get authorizationHeader() {
    if (this.personalAccessToken) {
      return `Bearer ${this.personalAccessToken}`;
    } else if (this.username && this.accessToken) {
      const authToken = Buffer.from(
        `${this.username}:${this.accessToken}`
      ).toString("base64");
      return `Basic ${authToken}`;
    }
    return undefined;
  }

  async load(options) {
    try {
      const pages = await this.fetchAllPagesInSpace(
        options?.start,
        options?.limit
      );
      return pages.map((page) => this.createDocumentFromPage(page));
    } catch (error) {
      this.log("Error:", error);
      return [];
    }
  }

  async fetchConfluenceData(url, retries = 0) {
    const prevTlsSetting = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    try {
      const initialHeaders = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };
      const authHeader = this.authorizationHeader;
      if (authHeader) initialHeaders.Authorization = authHeader;

      if (this.bypassSSL) process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

      const abortController = new AbortController();
      const timeout = setTimeout(() => abortController.abort(), 30_000);

      const response = await fetch(url, {
        headers: initialHeaders,
        signal: abortController.signal,
      }).finally(() => clearTimeout(timeout));

      if (response.status === 429 && retries < this.maxRetries) {
        const retryAfter = Number(response.headers.get("retry-after")) || 10;
        this.log(
          `Rate limit (429) for ${url}. Waiting ${retryAfter}s before retry ${
            retries + 1
          }/${this.maxRetries}…`
        );
        await new Promise((r) => setTimeout(r, retryAfter * 1000));
        return this.fetchConfluenceData(url, retries + 1);
      }

      if (!response.ok) {
        throw new Error(
          `Failed to fetch ${url} from Confluence: ${response.status}`
        );
      }
      return await response.json();
    } catch (error) {
      this.log("Error:", error);
      throw new Error(error.message);
    } finally {
      if (prevTlsSetting === undefined)
        delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
      else process.env.NODE_TLS_REJECT_UNAUTHORIZED = prevTlsSetting;
    }
  }

  // https://developer.atlassian.com/cloud/confluence/rest/v2/intro/#auth
  async fetchAllPagesInSpace(start = 0, limit = this.limit) {
    const MAX_PAGES = 50000;
    const allPages = [];
    let currentStart = start;
    while (allPages.length < MAX_PAGES) {
      const url = `${this.baseUrl}${
        this.cloud ? "/wiki" : ""
      }/rest/api/content?spaceKey=${
        this.spaceKey
      }&limit=${limit}&start=${currentStart}&expand=${this.expand}`;
      let data;
      try {
        data = await this.fetchConfluenceData(url);
      } catch (err) {
        this.log(
          `Error fetching page at start=${currentStart}, returning ${allPages.length} pages fetched so far:`,
          err.message
        );
        break;
      }
      const results = Array.isArray(data?.results) ? data.results : [];
      allPages.push(...results);
      if (!data || data.size === 0 || results.length === 0) break;
      currentStart += data.size;
    }
    return allPages;
  }

  createDocumentFromPage(page) {
    // Function to extract code blocks
    const extractCodeBlocks = (content) => {
      const codeBlockRegex =
        /<ac:structured-macro ac:name="code"[^>]*>[\s\S]*?<ac:plain-text-body><!\[CDATA\[([\s\S]*?)\]\]><\/ac:plain-text-body>[\s\S]*?<\/ac:structured-macro>/g;
      const languageRegex =
        /<ac:parameter ac:name="language">(.*?)<\/ac:parameter>/;

      return content.replace(codeBlockRegex, (match) => {
        const language = match.match(languageRegex)?.[1] || "";
        const code =
          match.match(
            /<ac:plain-text-body><!\[CDATA\[([\s\S]*?)\]\]><\/ac:plain-text-body>/
          )?.[1] || "";
        return `\n\`\`\`${language}\n${code.trim()}\n\`\`\`\n`;
      });
    };

    const contentWithCodeBlocks = extractCodeBlocks(page.body.storage.value);
    const plainTextContent = htmlToText(contentWithCodeBlocks, {
      wordwrap: false,
      preserveNewlines: true,
    });
    const textWithPreservedStructure = plainTextContent.replace(
      /\n{3,}/g,
      "\n\n"
    );
    const pageUrl = `${this.baseUrl}${this.cloud ? "/wiki" : ""}/spaces/${
      this.spaceKey
    }/pages/${page.id}`;

    return {
      pageContent: textWithPreservedStructure,
      metadata: {
        id: page.id,
        status: page.status,
        title: page.title,
        type: page.type,
        url: pageUrl,
        version: page.version?.number,
        updated_by: page.version?.by?.displayName,
        updated_at: page.version?.when,
      },
    };
  }
}

module.exports = { ConfluencePagesLoader };
