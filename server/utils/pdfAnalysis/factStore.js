// SPDX-License-Identifier: MIT
/**
 * FactStore — SQLite basierte Speicherung ausgewählter Einzelinformationen
 * mit vollem Quellenbezug (Dokument, Seite, wörtliches Zitat, Job-ID).
 *
 * Gegenüber der JSON-Variante:
 *  - FTS5-Volltextindex: Suche in Millisekunden statt Linear-Scan,
 *    auch bei Millionen Fakten (Prefix-Matching, Ranking nach bm25).
 *  - Transaktionale, crash-sichere Writes (WAL-Modus).
 *  - Automatische Einmal-Migration einer vorhandenen facts.json.
 *
 * Die öffentliche API ist identisch zur JSON-Variante (drop-in):
 * addFacts, get, search, remove, stats — plus _save() als No-Op-Shim,
 * damit die CrossCheckPipeline (Schritt 31) unverändert funktioniert
 * (dort wird crossCheck via updateCrossCheck persistiert, s.u.).
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const Database = require("better-sqlite3");
const { getStoragePath } = require("../paths");

const DB_FILE = getStoragePath("pdf-analysis", "facts.sqlite");
const LEGACY_JSON = getStoragePath("pdf-analysis", "facts.json");

class FactStore {
  constructor(dbFile = DB_FILE) {
    fs.mkdirSync(path.dirname(dbFile), { recursive: true });
    this.db = new Database(dbFile);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("synchronous = NORMAL");
    this._migrateSchema();
    this._migrateLegacyJson();
  }

  _migrateSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS facts (
        id TEXT PRIMARY KEY,
        detail TEXT NOT NULL,
        quote TEXT DEFAULT '',
        tags TEXT DEFAULT '[]',
        confidence REAL,
        verified INTEGER,
        document_name TEXT NOT NULL,
        document_path TEXT,
        page INTEGER NOT NULL,
        page_corrected INTEGER DEFAULT 0,
        job_id TEXT,
        cross_check TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_facts_document ON facts(document_name);
      CREATE INDEX IF NOT EXISTS idx_facts_page ON facts(document_name, page);

      CREATE VIRTUAL TABLE IF NOT EXISTS facts_fts USING fts5(
        detail, quote, tags,
        content='facts', content_rowid='rowid'
      );

      CREATE TRIGGER IF NOT EXISTS facts_ai AFTER INSERT ON facts BEGIN
        INSERT INTO facts_fts(rowid, detail, quote, tags)
        VALUES (new.rowid, new.detail, new.quote, new.tags);
      END;
      CREATE TRIGGER IF NOT EXISTS facts_ad AFTER DELETE ON facts BEGIN
        INSERT INTO facts_fts(facts_fts, rowid, detail, quote, tags)
        VALUES ('delete', old.rowid, old.detail, old.quote, old.tags);
      END;
    `);
  }

  /** Einmal-Migration einer vorhandenen facts.json (wird danach umbenannt). */
  _migrateLegacyJson() {
    if (!fs.existsSync(LEGACY_JSON)) return;
    try {
      const { facts = [] } = JSON.parse(fs.readFileSync(LEGACY_JSON, "utf8"));
      if (facts.length) {
        this.addFacts(
          facts.map((f) => ({
            detail: f.detail,
            quote: f.quote,
            tags: f.tags,
            confidence: f.confidence,
            verified: f.verified,
            source: f.source,
            createdAt: f.createdAt,
          })),
        );
        console.log(
          `[pdfAnalysis] ${facts.length} Fakten aus facts.json nach SQLite migriert.`,
        );
      }
      fs.renameSync(LEGACY_JSON, `${LEGACY_JSON}.migrated`);
    } catch (e) {
      console.error(
        `[pdfAnalysis] Migration von facts.json fehlgeschlagen: ${e.message}`,
      );
    }
  }

  static factId(fact) {
    return crypto
      .createHash("sha256")
      .update(`${fact.source.documentName}|${fact.source.page}|${fact.detail}`)
      .digest("hex")
      .slice(0, 16);
  }

  _rowToFact(row) {
    if (!row) return null;
    return {
      id: row.id,
      detail: row.detail,
      quote: row.quote,
      tags: JSON.parse(row.tags || "[]"),
      confidence: row.confidence,
      verified: row.verified === null ? null : !!row.verified,
      crossCheck: row.cross_check ? JSON.parse(row.cross_check) : undefined,
      source: {
        documentName: row.document_name,
        documentPath: row.document_path,
        page: row.page,
        pageCorrected: !!row.page_corrected,
        jobId: row.job_id,
      },
      createdAt: row.created_at,
    };
  }

  addFacts(facts) {
    const insert = this.db.prepare(`
      INSERT OR IGNORE INTO facts
        (id, detail, quote, tags, confidence, verified, document_name,
         document_path, page, page_corrected, job_id, created_at)
      VALUES (@id, @detail, @quote, @tags, @confidence, @verified,
              @document_name, @document_path, @page, @page_corrected,
              @job_id, @created_at)
    `);
    const tx = this.db.transaction((rows) => {
      let added = 0;
      for (const row of rows) added += insert.run(row).changes;
      return added;
    });
    return tx(
      facts
        .filter((f) => f.detail && f.source && f.source.documentName)
        .map((f) => ({
          id: FactStore.factId(f),
          detail: f.detail,
          quote: f.quote || "",
          tags: JSON.stringify(f.tags || []),
          confidence: f.confidence ?? null,
          verified:
            f.verified === undefined || f.verified === null
              ? null
              : f.verified
                ? 1
                : 0,
          document_name: f.source.documentName,
          document_path: f.source.documentPath || null,
          page: f.source.page,
          page_corrected: f.source.pageCorrected ? 1 : 0,
          job_id: f.source.jobId || null,
          created_at: f.createdAt || new Date().toISOString(),
        })),
    );
  }

  get(id) {
    return this._rowToFact(
      this.db.prepare("SELECT * FROM facts WHERE id = ?").get(id),
    );
  }

  /** Persistiert Kreuz-Verifikations-Urteile an einem Fakt. */
  updateCrossCheck(id, crossCheck) {
    return (
      this.db
        .prepare("UPDATE facts SET cross_check = ? WHERE id = ?")
        .run(JSON.stringify(crossCheck), id).changes > 0
    );
  }

  /** Shim für Aufrufer der JSON-Variante (SQLite persistiert sofort). */
  _save() {}

  search({ q, document, tag, page, limit = 50 } = {}) {
    const max = Math.min(Number(limit) || 50, 500);
    let rows;
    if (q && q.trim()) {
      // FTS5-Query: Terme escapen, Prefix-Matching, Ranking nach bm25
      const ftsQuery = q
        .trim()
        .split(/\s+/)
        .map((t) => `"${t.replace(/"/g, '""')}"*`)
        .join(" ");
      rows = this.db
        .prepare(
          `SELECT facts.* FROM facts_fts
           JOIN facts ON facts.rowid = facts_fts.rowid
           WHERE facts_fts MATCH ?
           ORDER BY bm25(facts_fts) LIMIT ?`,
        )
        .all(ftsQuery, max);
    } else {
      rows = this.db
        .prepare("SELECT * FROM facts ORDER BY created_at DESC LIMIT ?")
        .all(max);
    }
    let facts = rows.map((r) => this._rowToFact(r));
    if (document) {
      const needle = document.toLowerCase();
      facts = facts.filter((f) =>
        f.source.documentName.toLowerCase().includes(needle),
      );
    }
    if (tag) {
      const needle = String(tag).toLowerCase();
      facts = facts.filter((f) =>
        f.tags.some((t) => t.toLowerCase() === needle),
      );
    }
    if (page)
      facts = facts.filter((f) => Number(f.source.page) === Number(page));
    return facts;
  }

  remove(id) {
    return (
      this.db.prepare("DELETE FROM facts WHERE id = ?").run(id).changes > 0
    );
  }

  stats() {
    const total = this.db.prepare("SELECT COUNT(*) AS n FROM facts").get().n;
    const byDocument = {};
    for (const row of this.db
      .prepare(
        "SELECT document_name, COUNT(*) AS n FROM facts GROUP BY document_name",
      )
      .all())
      byDocument[row.document_name] = row.n;
    const verified = this.db
      .prepare("SELECT COUNT(*) AS n FROM facts WHERE verified = 1")
      .get().n;
    return { total, verified, byDocument };
  }
}

module.exports = { FactStore };
