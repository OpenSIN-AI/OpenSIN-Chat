// SPDX-License-Identifier: MIT
/**
 * CrossCheckPipeline — orchestriert die Kreuz-Verifikation.
 *
 * Eingabe: Behauptungen (direkt, aus gespeicherten Fakten via factIds,
 * oder automatisch aus einem abgeschlossenen Analyse-Job) + optionale
 * Vergleichsquellen (pdf/url/youtube/text) + optional Deep-Web-Recherche.
 *
 * Delegation: pro (Behauptung x Quelle) bzw. pro Behauptung (Web) arbeiten
 * eigenständige Recherche-Agenten parallel (über den vorhandenen AgentPool
 * mit AIMD-Regelung). Ergebnis: konsolidierter Verifikationsbericht +
 * Rückschreiben der Urteile an die betroffenen Fakten im FactStore.
 */
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const config = require("../config");
const { runPool } = require("../agentPool");
const { chat } = require("../llm");
const { compareAgainstSource, deepWebResearch } = require("./researchAgent");

const XCHECK_CONCURRENCY = Number(
  process.env.PDF_ANALYSIS_XCHECK_CONCURRENCY || 4
);
const XCHECK_REPORT_DIR = path.join(config.REPORT_DIR, "crosscheck");

const REPORT_SYSTEM = `Du bist ein Senior-Verifikationsanalyst. Erstelle aus Kreuz-Verifikations-Ergebnissen einen professionellen Bericht.
Struktur: # Titel, ## Executive Summary, ## Verifikationsmatrix (Behauptung x Quelle x Urteil), ## Detailbefunde je Behauptung (mit Beleg-Zitaten und URLs), ## Widersprüche & offene Punkte, ## Methodik.
Jedes Urteil MUSS mit Quelle (URL/Dokument) und Beleg-Zitat ausgewiesen werden. Sprache: Deutsch. Format: Markdown. Erfinde nichts.`;

const jobs = new Map();

class CrossCheckPipeline {
  static start(
    { claims = [], factIds = [], sources = [], deepWeb = false },
    factStore
  ) {
    // Behauptungen aus gespeicherten Fakten auflösen (mit Quellenbezug)
    const resolvedClaims = [
      ...claims.map((c) => ({ text: String(c), factId: null })),
    ];
    for (const id of factIds) {
      const fact = factStore.get(id);
      if (fact)
        resolvedClaims.push({
          text: `${fact.detail} (laut ${fact.source.documentName}, S. ${fact.source.page})`,
          factId: id,
        });
    }
    if (!resolvedClaims.length)
      throw new Error(
        "Keine Behauptungen angegeben (claims oder factIds)."
      );
    if (!sources.length && !deepWeb)
      throw new Error(
        "Mindestens eine Vergleichsquelle ODER deepWeb=true angeben."
      );

    const jobId = uuidv4();
    const job = {
      id: jobId,
      status: "running",
      cancelled: false,
      createdAt: new Date().toISOString(),
      claims: resolvedClaims,
      sources,
      deepWeb,
      progress: { tasksDone: 0, tasksTotal: 0 },
      result: null,
      error: null,
    };
    jobs.set(jobId, job);
    this._run(job, factStore).catch((e) => {
      job.status = "failed";
      job.error = e.message;
    });
    return { jobId };
  }

  static async _run(job, factStore) {
    // Aufgabenplan: pro Quelle ein Vergleichs-Task (alle Claims gebündelt),
    // plus pro Claim ein Deep-Web-Task — alles als Chunks für den AgentPool.
    const tasks = [];
    let index = 0;
    for (const source of job.sources)
      tasks.push({
        index: index++,
        pageStart: 0,
        pageEnd: 0,
        kind: "source",
        source,
      });
    if (job.deepWeb)
      for (let c = 0; c < job.claims.length; c++)
        tasks.push({
          index: index++,
          pageStart: 0,
          pageEnd: 0,
          kind: "web",
          claimIdx: c,
        });

    job.progress.tasksTotal = tasks.length;
    const claimTexts = job.claims.map((c) => c.text);

    const results = await runPool(
      tasks,
      XCHECK_CONCURRENCY,
      async (task) => {
        if (task.kind === "source") {
          const r = await compareAgainstSource(claimTexts, task.source);
          return { chunkIndex: task.index, kind: "source", ...r };
        }
        const r = await deepWebResearch(claimTexts[task.claimIdx]);
        return {
          chunkIndex: task.index,
          kind: "web",
          claimIdx: task.claimIdx,
          ...r,
        };
      },
      {
        isCancelled: () => job.cancelled,
        onProgress: (done, total) => {
          job.progress.tasksDone = done;
          job.progress.tasksTotal = total;
        },
      }
    );

    // Urteile pro Behauptung aggregieren
    const perClaim = job.claims.map((c) => ({
      claim: c.text,
      factId: c.factId,
      sourceVerdicts: [],
      webResearch: null,
    }));
    for (const r of results) {
      if (!r) continue;
      if (r.kind === "source") {
        for (const v of r.verdicts || [])
          perClaim[v.claimIndex]?.sourceVerdicts.push({
            source: r.sourceLabel,
            verdict: v.verdict,
            evidence: v.evidence,
            reasoning: v.reasoning,
          });
      } else if (r.kind === "web") {
        perClaim[r.claimIdx].webResearch = {
          overall: r.overall,
          sourcesChecked: r.sourcesChecked,
          supports: r.supports,
          contradicts: r.contradicts,
          evidence: r.evidence,
        };
      }
    }

    // Konsolidierten Bericht erstellen
    const report = await chat(
      REPORT_SYSTEM,
      `Kreuz-Verifikations-Rohdaten (JSON):\n${JSON.stringify(
        perClaim,
        null,
        2
      )}`
    );
    fs.mkdirSync(XCHECK_REPORT_DIR, { recursive: true });
    const reportFile = path.join(XCHECK_REPORT_DIR, `${job.id}.md`);
    fs.writeFileSync(reportFile, report);

    // Urteile an gespeicherte Fakten zurückschreiben (Quellen-Speicherung)
    let factsUpdated = 0;
    for (const pc of perClaim) {
      if (!pc.factId) continue;
      const ok = factStore.updateCrossCheck(pc.factId, {
        jobId: job.id,
        checkedAt: new Date().toISOString(),
        sourceVerdicts: pc.sourceVerdicts,
        webOverall: pc.webResearch?.overall ?? null,
        webEvidence: (pc.webResearch?.evidence || []).map((e) => ({
          url: e.url,
          verdict: e.verdict,
          quote: e.quote,
        })),
      });
      if (ok) factsUpdated++;
    }

    job.result = { reportFile, perClaim, factsUpdated };
    job.status = "completed";
  }

  static getStatus(jobId) {
    const job = jobs.get(jobId);
    if (!job) return null;
    const { id, status, progress, error, createdAt, deepWeb } = job;
    return {
      id,
      status,
      progress,
      error,
      createdAt,
      deepWeb,
      claims: job.claims.map((c) => c.text),
      sources: job.sources.length,
    };
  }

  static getResult(jobId) {
    const job = jobs.get(jobId);
    if (!job) return null;
    if (job.status !== "completed")
      return { status: job.status, error: job.error };
    const report = fs.existsSync(job.result.reportFile)
      ? fs.readFileSync(job.result.reportFile, "utf8")
      : null;
    return { status: "completed", ...job.result, report };
  }

  static list() {
    return [...jobs.values()].map((j) => CrossCheckPipeline.getStatus(j.id));
  }

  static cancel(jobId) {
    const job = jobs.get(jobId);
    if (!job) return false;
    job.cancelled = true;
    return true;
  }
}

module.exports = { CrossCheckPipeline };
