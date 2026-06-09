// SPDX-License-Identifier: MIT
/**
 * Content extractor — fetches URL content and converts to clean text.
 *
 * Docs: contentExtractor.doc.md
 * Purpose: Extract readable content from URLs for the research pipeline.
 * Uses fetch + basic HTML-to-text conversion.
 */

class ContentExtractor {
  /**
   * Extract content from a URL.
   * @param {string} url
   * @returns {Promise<string|null>}
   */
  static async extract(url) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "OpenAfD-Chat/1.0 (Research Pipeline)",
          Accept: "text/html,text/plain,application/json",
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) return null;
      const contentType = res.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        const json = await res.json();
        return JSON.stringify(json, null, 2).substring(0, 10000);
      }

      if (contentType.includes("text/plain")) {
        const text = await res.text();
        return text.substring(0, 10000);
      }

      if (contentType.includes("text/html")) {
        const html = await res.text();
        return ContentExtractor.#htmlToText(html).substring(0, 10000);
      }

      return null;
    } catch (err) {
      return null;
    }
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

module.exports = { ContentExtractor };
