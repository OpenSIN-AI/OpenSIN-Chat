// SPDX-License-Identifier: MIT
/**
 * FactStore — verlässliche Speicherung ausgewählter Einzelinformationen
 * mit vollem Quellenbezug (Dokument, Seite, wörtliches Zitat, Job-ID).
 *
 * Datei-basiert (JSON, atomare Writes) — dependency-frei und robust für
 * den selbst gehosteten Betrieb. Deduplikation über Inhalts-Hash.
 */
const fs = require("fs");
const crypto = require("crypto");
const path = require("path");
const { FACTS_FILE } = require("./config");

class FactStore {
  constructor(file = FACTS_FILE) {
    this.file = file;
    this._cache = null;
  }

  _load() {
    if (this._cache) return this._cache;
    if (!fs.existsSync(this.file)) {
      this._cache = { facts: [] };
      return this._cache;
    }
    try {
      this._cache = JSON.parse(fs.readFileSync(this.file, "utf8"));
    } catch {
      this._cache = { facts: [] };
    }
    return this._cache;
  }

  _save() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this._cache, null, 2));
    fs.renameSync(tmp, this.file); // atomar
  }

  static factId(fact) {
    return crypto
      .createHash("sha256")
      .update(
        `${fact.source.documentName}|${fact.source.page}|${fact.detail}`
      )
      .digest("hex")
      .slice(0, 16);
  }

  /**
   * Fügt Fakten hinzu (dedupliziert). Jeder Fakt MUSS eine Quelle tragen.
   */
  addFacts(facts) {
    const db = this._load();
    const existing = new Set(db.facts.map((f) => f.id));
    let added = 0;
    for (const fact of facts) {
      if (!fact.detail || !fact.source || !fact.source.documentName) continue;
      const id = FactStore.factId(fact);
      if (existing.has(id)) continue;
      db.facts.push({
        id,
        detail: fact.detail,
        quote: fact.quote || "",
        tags: fact.tags || [],
        confidence: fact.confidence ?? null,
        verified: fact.verified ?? null,
        source: {
          documentName: fact.source.documentName,
          documentPath: fact.source.documentPath || null,
          page: fact.source.page,
          pageCorrected: fact.source.pageCorrected || false,
          jobId: fact.source.jobId || null,
        },
        createdAt: new Date().toISOString(),
      });
      existing.add(id);
      added++;
    }
    if (added > 0) this._save();
    return added;
  }

  get(id) {
    return this._load().facts.find((f) => f.id === id) || null;
  }

  /**
   * Suche: Freitext (detail/quote), Dokumentname, Tag, Seite — kombinierbar.
   */
  search({ q, document, tag, page, limit = 50 } = {}) {
    let facts = this._load().facts;
    if (q) {
      const needle = q.toLowerCase();
      facts = facts.filter(
        (f) =>
          f.detail.toLowerCase().includes(needle) ||
          f.quote.toLowerCase().includes(needle)
      );
    }
    if (document)
      facts = facts.filter((f) =>
        f.source.documentName.toLowerCase().includes(document.toLowerCase())
      );
    if (tag)
      facts = facts.filter((f) =>
        f.tags.some((t) => t.toLowerCase() === tag.toLowerCase())
      );
    if (page) facts = facts.filter((f) => Number(f.source.page) === Number(page));
    return facts.slice(0, Number(limit));
  }

  remove(id) {
    const db = this._load();
    const before = db.facts.length;
    db.facts = db.facts.filter((f) => f.id !== id);
    if (db.facts.length !== before) {
      this._save();
      return true;
    }
    return false;
  }

  stats() {
    const facts = this._load().facts;
    const byDocument = {};
    for (const f of facts)
      byDocument[f.source.documentName] =
        (byDocument[f.source.documentName] || 0) + 1;
    return { total: facts.length, byDocument };
  }
}

module.exports = { FactStore };
