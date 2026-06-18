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

const DIP_BASE = "https://dserver.bundestag.de";
const BUNDESTAG_BASE = "https://www.bundestag.de";
// DIP (Dokumentations- und Informationssystem für Parlamentsmaterialien) REST
// API — used as a robust fallback when the dserver protocol XML is unavailable
// (Issue #52). A public demo API key is published by the Bundestag; callers may
// override it via BUNDESTAG_API_KEY.
const DIP_API_BASE = "https://search.dip.bundestag.de/api/v1";
const DIP_PUBLIC_API_KEY = "I9FKdCn.hbfefNWCY336dL6x62vfwNKpoN2RZ1gp21";

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
    this.fetchTimeoutMs = 30000;
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
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.fetchTimeoutMs);
        try {
          return await fetch(url, {
            headers: { "User-Agent": "OpenSIN-Chat/1.0" },
            signal: controller.signal,
            ...opts,
          });
        } finally {
          clearTimeout(timer);
        }
      } catch (err) {
        lastError = err;
        if (attempt < this.maxRetries)
          await new Promise((r) => setTimeout(r, this.retryDelayMs * attempt));
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
    const padded = String(sitting).padStart(3, "0");
    return `${DIP_BASE}/btp/${session}/${session}${padded}.xml`;
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
      if (res.ok) {
        const speeches = await this.#parseXmlProtocol(xmlUrl, session, sitting);
        if (speeches.length > 0) return speeches;
      }
    } catch (err) {
      this.log(
        `XML protocol fetch failed (${err.message}), falling back to DIP API`,
      );
    }

    // Fallback: DIP API (Issue #52) — more robust than scraping dserver.
    this.log(
      `dserver XML unavailable for ${session}/${sitting}, trying DIP API fallback`,
    );
    try {
      const speeches = await this.fetchProtocolViaDip(session, sitting);
      if (speeches.length > 0) return speeches;
    } catch (err) {
      this.log(
        `DIP API fallback failed for ${session}/${sitting}: ${err.message}`,
      );
    }

    return [];
  }

  /**
   * Resolve the DIP API key, preferring an operator-supplied env var and
   * falling back to the published public demo key.
   * @returns {string}
   */
  #dipApiKey() {
    return process.env.BUNDESTAG_API_KEY || DIP_PUBLIC_API_KEY;
  }

  /**
   * Fallback fetch via the DIP REST API (Issue #52).
   *
   * Looks up the plenarprotokoll-text resource for a given Wahlperiode +
   * Sitzungsnummer and extracts speeches from the returned structured text.
   * This avoids dependence on the dserver blob XML which is occasionally
   * unavailable.
   *
   * @param {number} session - Wahlperiode (e.g. 20)
   * @param {number} sitting - Sitzungsnummer
   * @returns {Promise<PlenarSpeech[]>}
   */
  async fetchProtocolViaDip(session, sitting) {
    const params = new URLSearchParams({
      "f.wahlperiode": String(session),
      "f.dokumentnummer": `${session}/${sitting}`,
      format: "json",
      apikey: this.#dipApiKey(),
    });
    const url = `${DIP_API_BASE}/plenarprotokoll-text?${params.toString()}`;
    this.log(`Fetching protocol ${session}/${sitting} via DIP API`);

    const res = await this.#fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`DIP API HTTP ${res.status}`);

    const json = await res.json();
    const documents = Array.isArray(json?.documents) ? json.documents : [];
    if (documents.length === 0) return [];

    const speeches = [];
    for (const doc of documents) {
      const fullText = typeof doc.text === "string" ? doc.text : "";
      if (!fullText.trim()) continue;
      const docUrl =
        doc?.fundstelle?.pdf_url ||
        doc?.fundstelle?.xml_url ||
        `${DIP_API_BASE}/plenarprotokoll/${doc.id || ""}`;
      const date = doc.datum || null;

      for (const block of this.#splitDipTextIntoSpeeches(fullText)) {
        speeches.push({
          speakerName: block.speakerName,
          speakerParty: block.speakerParty,
          text: block.text,
          top: `Sitzung ${sitting}`,
          date: date || new Date().toISOString().slice(0, 10),
          session,
          sitting,
          pageNumbers: null,
          documentUrl: docUrl,
        });
      }
    }

    this.log(
      `DIP API yielded ${speeches.length} speeches for ${session}/${sitting}`,
    );
    return speeches;
  }

  /**
   * Split a DIP plenarprotokoll plain-text body into speaker blocks.
   *
   * DIP text marks speakers with a leading "Name (Fraktion):" pattern at the
   * start of a paragraph. We use that as a delimiter. This is intentionally
   * conservative — unrecognised blocks are skipped rather than mis-attributed.
   *
   * @param {string} text
   * @returns {Array<{speakerName: string, speakerParty: string|null, text: string}>}
   */
  #splitDipTextIntoSpeeches(text) {
    const blocks = [];
    // Matches e.g. "Dr. Alice Weidel (AfD):" or "Max Mustermann (SPD):"
    const speakerRe =
      /(^|\n)\s*([A-ZÄÖÜ][\wÄÖÜäöüß.\- ]{2,60}?)\s*\(([^)]{2,40})\):/g;
    const markers = [];
    let m;
    while ((m = speakerRe.exec(text)) !== null) {
      markers.push({
        index: m.index + (m[1] ? m[1].length : 0),
        speakerName: m[2].trim(),
        speakerParty: m[3].trim(),
        contentStart: speakerRe.lastIndex,
      });
    }

    for (let i = 0; i < markers.length; i++) {
      const cur = markers[i];
      const end = i + 1 < markers.length ? markers[i + 1].index : text.length;
      const body = text.slice(cur.contentStart, end).trim();
      if (body.length < 40) continue; // skip interjections / one-liners
      blocks.push({
        speakerName: cur.speakerName,
        speakerParty: cur.speakerParty,
        text: body,
      });
    }
    return blocks;
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
      if (!res.ok) {
        this.log(`HTTP ${res.status} for XML protocol ${url}`);
        return [];
      }
      const xmlText = await res.text();

      // Extract the document date from the root <datum date="DD.MM.YYYY"> element.
      // This sits outside <rede> blocks, so we parse it once and pass it through.
      let docDate = null;
      const dateAttrMatch = xmlText.match(
        /<datum[^>]*\bdate="(\d{2})\.(\d{2})\.(\d{4})"/i,
      );
      if (dateAttrMatch) {
        docDate = `${dateAttrMatch[3]}-${dateAttrMatch[2]}-${dateAttrMatch[1]}`;
      }

      // Bundestag DIP XML uses namespaced elements.
      // Extract speaker blocks: <rede> elements contain speaker info and text.
      const speeches = [];
      const redeRegex = /<rede\b[^>]*>([\s\S]*?)<\/rede>/gi;
      let match;

      while ((match = redeRegex.exec(xmlText)) !== null) {
        const block = match[1];
        const speech = this.#parseRedeBlock(
          block,
          session,
          sitting,
          url,
          docDate,
        );
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
  #parseRedeBlock(block, session, sitting, protocolUrl, docDate) {
    try {
      const getName = () => {
        const nMatch = block.match(
          /<redner[^>]*>[\s\S]*?<name>[\s\S]*?<vorname>([^<]*)<\/vorname>[\s\S]*?<nachname>([^<]*)<\/nachname>/i,
        );
        if (nMatch) {
          return { first: nMatch[1].trim(), last: nMatch[2].trim() };
        }
        return null;
      };

      const getParty = () => {
        const pMatch = block.match(/<fraktion>([^<]*)<\/fraktion>/i);
        return pMatch ? pMatch[1].trim() : null;
      };

      const getText = () => {
        // Collect all <p> elements within the rede block, excluding the
        // speaker-introduction paragraph (<p klasse="redner">) which contains
        // the <redner> metadata and "Name (Fraktion):" label, not speech text.
        const paragraphs = [];
        const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
        let pm;
        while ((pm = pRegex.exec(block)) !== null) {
          const pTag = pm[0].slice(0, pm[0].indexOf(">") + 1);
          if (/klasse="redner"/i.test(pTag)) continue;
          paragraphs.push(pm[1].replace(/<[^>]+>/g, "").trim());
        }
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
        speakerParty: getParty(),
        text: getText(),
        top: getTop() || `Sitzung ${sitting}`,
        date: getDate() || docDate || new Date().toISOString().slice(0, 10),
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
    // Probe the dserver for available sittings using binary search.
    // The old hardcoded bundestag.de blob URL is dead; the dserver XML files
    // follow the pattern /btp/{wp}/{wp}{NNN}.xml with 3-digit padding.
    const checkSitting = async (s) => {
      const padded = String(s).padStart(3, "0");
      const url = `${DIP_BASE}/btp/${session}/${session}${padded}.xml`;
      try {
        const res = await this.#fetch(url, { method: "HEAD" });
        return res.ok;
      } catch {
        return false;
      }
    };

    try {
      if (!(await checkSitting(1))) return [];

      // Binary search for the highest available sitting (cap at 300).
      let lo = 1;
      let hi = 300;
      let highest = 1;
      while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        if (await checkSitting(mid)) {
          highest = mid;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }

      const sittings = [];
      for (let i = 1; i <= highest; i++)
        sittings.push({ sitting: i, date: null });
      this.log(
        `Session index: ${highest} sittings discovered for WP ${session}`,
      );
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
    if (!speech?.speakerName || !speech.speakerName.trim())
      return { politicianId: null, confidence: 0 };

    const names = speech.speakerName.trim().split(" ");
    const lastName = names[names.length - 1]?.toLowerCase();
    const firstName = names[0]?.toLowerCase();

    // Try exact match first
    const key = `${lastName}, ${firstName}`;
    if (nameMap.has(key))
      return { politicianId: nameMap.get(key).id, confidence: 0.9 };

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
