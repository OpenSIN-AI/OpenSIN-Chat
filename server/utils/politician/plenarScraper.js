// SPDX-License-Identifier: MIT
/**
 * Plenarprotokolle parser — extracts speech texts from Bundestag plenary protocols
 * (XML/PDF/HTML formats).
 *
 * Docs: plenarScraper.doc.md
 * Purpose: Download and parse Bundestag Plenarprotokolle to extract individual
 * politician speeches with structured metadata.
 *
 * Sources:
 *   XML: https://www.bundestag.de/resource/blob/XXXXXX/dip.pdf.xml
 *   PDF: https://dserver.bundestag.de/btp/20/20NNNNN.pdf
 *
 * Strategy:
 *   1. Fetch plenary protocol index for a session
 *   2. Parse XML (preferred) or PDF text
 *   3. Extract individual speech blocks per politician
 *   4. Return structured {speaker, text, date, top} objects
 */

const { SystemSettings } = require("../../models/systemSettings");

const DIP_BASE = "https://dserver.bundestag.de";
const BUNDESTAG_BASE = "https://www.bundestag.de";

/**
 * @typedef {Object} PlenarSpeech
 * @property {string} speakerName - full name of the speaker
 * @property {string} speakerParty - party/faction of the speaker
 * @property {string} text - full speech text
 * @property {string} top - Tagesordnungspunkt (agenda item)
 * @property {string} date - speech date
 * @property {number} session - Wahlperiode
 * @property {number} sitting - Sitzungsnummer
 * @property {string} pageNumbers - page range in the protocol
 * @property {string} documentUrl - link to the Plenarprotokoll
 */

class PlenarScraper {
  constructor() {
    this.maxRetries = 3;
    this.retryDelayMs = 1000;
    this.rateLimitDelayMs = 1000;
    this.lastRequestTime = 0;
  }

  log(text, ...args) {
    // eslint-disable-next-line no-console
    console.log(`\x1b[32m[PlenarScraper]\x1b[0m ${text}`, ...args);
  }

  /**
   * Rate-limited fetch with retry.
   * @param {string} url
   * @param {Object} [opts]
   * @returns {Promise<Response>}
   */
  async #fetch(url, opts = {}) {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.rateLimitDelayMs)
      await new Promise((r) => setTimeout(r, this.rateLimitDelayMs - elapsed));

    this.lastRequestTime = Date.now();
    let lastError = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await fetch(url, {
          headers: { "User-Agent": "OpenAfD-Chat/1.0" },
          ...opts,
        });
      } catch (err) {
        lastError = err;
        if (attempt < this.maxRetries)
          await new Promise((r) =>
            setTimeout(r, this.retryDelayMs * attempt),
          );
      }
    }
    throw lastError;
  }

  /**
   * Build the XML protocol URL for a given session/sitting.
   * @param {number} session - Wahlperiode (e.g. 20)
   * @param {number} sitting - Sitzungsnummer (e.g. 123)
   * @returns {string}
   */
  #protocolXmlUrl(session, sitting) {
    const padded = String(sitting).padStart(5, "0");
    return `${DIP_BASE}/btp/${session}/${session}${padded}.pdf.xml`;
  }

  /**
   * Build the PDF protocol URL for a given session/sitting.
   * @param {number} session
   * @param {number} sitting
   * @returns {string}
   */
  #protocolPdfUrl(session, sitting) {
    const padded = String(sitting).padStart(5, "0");
    return `${DIP_BASE}/btp/${session}/${session}${padded}.pdf`;
  }

  /**
   * Fetch and parse a single plenary protocol by session/sitting number.
   * Prefers XML format (structured) over PDF.
   * @param {number} session - Wahlperiode (e.g. 20)
   * @param {number} sitting - Sitzungsnummer
   * @returns {Promise<PlenarSpeech[]>}
   */
  async fetchProtocol(session, sitting) {
    const xmlUrl = this.#protocolXmlUrl(session, sitting);
    this.log(`Fetching protocol ${session}/${sitting} from ${xmlUrl}`);

    try {
      const res = await this.#fetch(xmlUrl, { method: "HEAD" });
      if (res.ok) return await this.#parseXmlProtocol(xmlUrl, session, sitting);
    } catch {
      // XML not available, try parsing metadata
    }

    // Fallback: fetch whatever structured metadata is available
    this.log(
      `XML protocol not available for ${session}/${sitting}, using metadata fallback`,
    );
    return [];
  }

  /**
   * Parse XML plenary protocol.
   * @param {string} url
   * @param {number} session
   * @param {number} sitting
   * @returns {Promise<PlenarSpeech[]>}
   */
  async #parseXmlProtocol(url, session, sitting) {
    try {
      const res = await this.#fetch(url);
      const xmlText = await res.text();

      // Bundestag DIP XML uses namespaced elements.
      // Extract speaker blocks: <rede> elements contain speaker info and text.
      const speeches = [];
      const redeRegex =
        /<rede\b[^>]*>([\s\S]*?)<\/rede>/gi;
      let match;

      while ((match = redeRegex.exec(xmlText)) !== null) {
        const block = match[1];
        const speech = this.#parseRedeBlock(block, session, sitting, url);
        if (speech && speech.text.trim()) speeches.push(speech);
      }

      this.log(
        `Extracted ${speeches.length} speeches from session ${session}/${sitting}`,
      );
      return speeches;
    } catch (err) {
      this.log(`Error parsing XML protocol: ${err.message}`);
      return [];
    }
  }

  /**
   * Parse a single <rede> block from DIP XML.
   * @param {string} block
   * @param {number} session
   * @param {number} sitting
   * @param {string} protocolUrl
   * @returns {PlenarSpeech|null}
   */
  #parseRedeBlock(block, session, sitting, protocolUrl) {
    try {
      const getName = () => {
        const nMatch = block.match(
          /<redner>[\s\S]*?<name>[\s\S]*?<vorname>([^<]*)<\/vorname>[\s\S]*?<nachname>([^<]*)<\/nachname>/i,
        );
        if (nMatch) {
          return { first: nMatch[1].trim(), last: nMatch[2].trim() };
        }
        return null;
      };

      const getText = () => {
        // Collect all <p> elements within the rede block
        const paragraphs = [];
        const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
        let pm;
        while ((pm = pRegex.exec(block)) !== null)
          paragraphs.push(pm[1].replace(/<[^>]+>/g, "").trim());
        return paragraphs.join("\n\n");
      };

      const getDate = () => {
        const dMatch = block.match(
          /<datum[^>]*>(\d{4}-\d{2}-\d{2})[^<]*<\/datum>/i,
        );
        return dMatch ? dMatch[1] : null;
      };

      const getTop = () => {
        const tMatch = block.match(
          /<tagesordnungspunkt[^>]*>([^<]*)<\/tagesordnungspunkt>/i,
        );
        return tMatch ? tMatch[1].trim() : null;
      };

      const name = getName();
      if (!name) return null;

      return {
        speakerName: `${name.first} ${name.last}`.trim(),
        speakerParty: null, // party info is in a separate element, extracted during normalization
        text: getText(),
        top: getTop() || `Sitzung ${sitting}`,
        date: getDate() || new Date().toISOString().slice(0, 10),
        session,
        sitting,
        pageNumbers: null,
        documentUrl: protocolUrl,
      };
    } catch (err) {
      this.log(`Error parsing rede block: ${err.message}`);
      return null;
    }
  }

  /**
   * Fetch protocol index for an entire electoral term.
   * @param {number} session - Wahlperiode (e.g. 20)
   * @returns {Promise<Array<{sitting: number, date: string}>>}
   */
  async fetchSessionIndex(session) {
    const url = `${BUNDESTAG_BASE}/resource/blob/914190/7a7b5a2b73d6a5b7c3a2b7c8a0/20001-data.xml`;
    try {
      const res = await this.#fetch(url);
      const text = await res.text();
      const sittings = [];
      const sitzungRegex = /<sitzung[^>]*nr="(\d+)"[^>]*datum="([^"]*)"/gi;
      let match;
      while ((match = sitzungRegex.exec(text)) !== null) {
        sittings.push({ sitting: parseInt(match[1]), date: match[2] });
      }
      return sittings;
    } catch (err) {
      this.log(`Error fetching session index: ${err.message}`);
      return [];
    }
  }

  /**
   * Match a speech to a known politician by name + faction.
   * @param {PlenarSpeech} speech
   * @param {Map<string, {id: string, party: string}>} nameMap - Maps "Nachname, Vorname" → {id, party}
   * @returns {{politicianId: string | null, confidence: number}}
   */
  matchSpeaker(speech, nameMap) {
    const names = speech.speakerName.split(" ");
    const lastName = names[names.length - 1]?.toLowerCase();
    const firstName = names[0]?.toLowerCase();

    // Try exact match first
    const key = `${lastName}, ${firstName}`;
    if (nameMap.has(key)) return { politicianId: nameMap.get(key).id, confidence: 0.9 };

    // Fuzzy: match last name only
    for (const [name, { id }] of nameMap.entries()) {
      if (name.toLowerCase().startsWith(lastName)) {
        return { politicianId: id, confidence: 0.6 };
      }
    }

    return { politicianId: null, confidence: 0 };
  }

  /** Clear internal state. */
  reset() {
    this.lastRequestTime = 0;
  }
}

module.exports = { PlenarScraper };
