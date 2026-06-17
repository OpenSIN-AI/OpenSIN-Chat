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
const { getStoragePath } = require("../paths");

// better-sqlite3 is a native module. In some environments (missing build
// toolchain, incompatible prebuilt bindings, restricted sandboxes) it cannot
// be loaded. Guard the require so that a single optional dependency can never
// crash the entire server at boot — the PDF-analysis feature degrades to a
// pure-JS JSON-backed store instead (identical public API).
let Database = null;
try {
  Database = require("better-sqlite3");
  // require() succeeds even when the native bindings are missing; the failure
  // only surfaces on instantiation. Probe an in-memory DB so we detect an
  // unusable engine here and fall back cleanly instead of crashing later.
  new Database(":memory:").close();
} catch (e) {
  Database = null;
  console.warn(
    `[pdfAnalysis] better-sqlite3 nicht verfügbar (${e.message.split("\n")[0]}). ` +
      `FactStore nutzt den JSON-Fallback (keine FTS5-Volltextsuche, langsamer bei sehr großen Korpora).`,
  );
}

const DB_FILE = getStoragePath("pdf-analysis", "facts.sqlite");
const LEGACY_JSON = getStoragePath("pdf-analysis", "facts.json");
const JSON_FILE = getStoragePath("pdf-analysis", "facts.json");

class FactStore {
  constructor(dbFile = DB_FILE) {
    // Graceful degradation: if the native SQLite engine is unavailable, hand
    // back a JSON-backed store with the same API. Returning an object from a
    // constructor overrides `this`, so `new FactStore()` callers transparently
    // receive the fallback without any further changes.
    if (!Database) return new JsonFactStore(JSON_FILE);

    fs.mkdirSync(path.dirname(dbFile), { recursive: true });
    this.db = new Database(dbFile);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("synchronous = NORMAL");
    this.db.pragma("auto_vacuum = INCREMENTAL");
    this._insertCount = 0;
    this._vacuumThreshold = Number(
      process.env.PDF_ANALYSIS_FACT_VACUUM_THRESHOLD || 500,
    );
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
    const added = tx(
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
    this._insertCount += added;
    if (this._insertCount >= this._vacuumThreshold) {
      this._insertCount = 0;
      try {
        this.db.pragma("incremental_vacuum(500)");
      } catch {
        /* non-fatal — next cycle retries */
      }
    }
    return added;
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

  /** Full VACUUM — defragmentiert die gesamte DB. Teuer, nur manuell/periodisch aufrufen. */
  vacuum() {
    this.db.exec("VACUUM");
  }

  /** Incremental VACUUM — räumt freie Pages auf, ohne die DB zu blockieren. */
  incrementalVacuum(pages = 500) {
    this.db.pragma(`incremental_vacuum(${pages})`);
  }

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

/**
 * JsonFactStore — reiner JS-Fallback ohne native Abhängigkeiten.
 *
 * Implementiert exakt dieselbe öffentliche API wie FactStore
 * (addFacts, get, updateCrossCheck, _save, search, remove, stats), persistiert
 * nach facts.json. Ohne FTS5; die Suche ist ein Linear-Scan mit
 * Teilstring-/Token-Matching. Für typische Dokumentmengen völlig ausreichend,
 * nur bei sehr großen Korpora langsamer als die SQLite-Variante.
 */
class JsonFactStore {
  constructor(jsonFile = JSON_FILE) {
    this.jsonFile = jsonFile;
    this.facts = new Map();
    fs.mkdirSync(path.dirname(jsonFile), { recursive: true });
    this._load();
  }

  _load() {
    if (!fs.existsSync(this.jsonFile)) return;
    try {
      const { facts = [] } = JSON.parse(fs.readFileSync(this.jsonFile, "utf8"));
      for (const f of facts) if (f && f.id) this.facts.set(f.id, f);
    } catch (e) {
      console.error(
        `[pdfAnalysis] facts.json konnte nicht gelesen werden: ${e.message}`,
      );
    }
  }

  _save() {
    try {
      fs.writeFileSync(
        this.jsonFile,
        JSON.stringify({ facts: [...this.facts.values()] }, null, 2),
        "utf8",
      );
    } catch (e) {
      console.error(
        `[pdfAnalysis] facts.json konnte nicht geschrieben werden: ${e.message}`,
      );
    }
  }

  addFacts(facts) {
    let added = 0;
    for (const f of facts) {
      if (!f.detail || !f.source || !f.source.documentName) continue;
      const id = FactStore.factId(f);
      if (this.facts.has(id)) continue;
      this.facts.set(id, {
        id,
        detail: f.detail,
        quote: f.quote || "",
        tags: f.tags || [],
        confidence: f.confidence ?? null,
        verified:
          f.verified === undefined || f.verified === null ? null : !!f.verified,
        crossCheck: undefined,
        source: {
          documentName: f.source.documentName,
          documentPath: f.source.documentPath || null,
          page: f.source.page,
          pageCorrected: !!f.source.pageCorrected,
          jobId: f.source.jobId || null,
        },
        createdAt: f.createdAt || new Date().toISOString(),
      });
      added += 1;
    }
    if (added) this._save();
    return added;
  }

  get(id) {
    return this.facts.get(id) || null;
  }

  updateCrossCheck(id, crossCheck) {
    const fact = this.facts.get(id);
    if (!fact) return false;
    fact.crossCheck = crossCheck;
    this._save();
    return true;
  }

  search({ q, document, tag, page, limit = 50 } = {}) {
    const max = Math.min(Number(limit) || 50, 500);
    let facts = [...this.facts.values()].sort((a, b) =>
      String(b.createdAt).localeCompare(String(a.createdAt)),
    );
    if (q && q.trim()) {
      const terms = q.trim().toLowerCase().split(/\s+/);
      facts = facts.filter((f) => {
        const haystack =
          `${f.detail} ${f.quote} ${(f.tags || []).join(" ")}`.toLowerCase();
        return terms.every((t) => haystack.includes(t));
      });
    }
    if (document) {
      const needle = document.toLowerCase();
      facts = facts.filter((f) =>
        f.source.documentName.toLowerCase().includes(needle),
      );
    }
    if (tag) {
      const needle = String(tag).toLowerCase();
      facts = facts.filter((f) =>
        (f.tags || []).some((t) => String(t).toLowerCase() === needle),
      );
    }
    if (page)
      facts = facts.filter((f) => Number(f.source.page) === Number(page));
    return facts.slice(0, max);
  }

  remove(id) {
    const existed = this.facts.delete(id);
    if (existed) this._save();
    return existed;
  }

  stats() {
    const byDocument = {};
    let verified = 0;
    for (const f of this.facts.values()) {
      byDocument[f.source.documentName] =
        (byDocument[f.source.documentName] || 0) + 1;
      if (f.verified === true) verified += 1;
    }
    return { total: this.facts.size, verified, byDocument };
  }
}

module.exports = { FactStore, JsonFactStore };
