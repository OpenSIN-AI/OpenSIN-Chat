// SPDX-License-Identifier: MIT
/**
 * CorpusPipeline — analysiert mehrere PDFs in einem Job und erstellt einen
 * konsolidierten Vergleichs-Report.
 *
 * Vorgehen (maximale Wiederverwendung der Einzel-Pipeline):
 *  1. Pro Dokument einen regulären PdfAnalysisPipeline-Job starten —
 *     sequenziell gestaffelt nach CORPUS_DOC_CONCURRENCY (die Agenten-
 *     Parallelität LEBT bereits in jedem Einzel-Job; mehrere gleichzeitig
 *     laufende Dokumente multiplizieren die LLM-Last).
 *  2. Auf Abschluss aller Einzel-Jobs warten (Polling, abbruchfähig).
 *     Fakten/Verifikation/Critic laufen dabei automatisch mit — alle
 *     Fakten landen mit Dokument-Quellenbezug im gemeinsamen FactStore.
 *  3. CorpusComparator: Vergleichs-Synthese + konsolidierter Report.
 *
 * Persistenz nach demselben Muster wie Analyse-Jobs (atomare Snapshots).
 */
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const config = require("../config");
const { PdfAnalysisPipeline } = require("../index");
const { compareCorpus } = require("./comparator");

const DOC_CONCURRENCY = Number(
  process.env.PDF_ANALYSIS_CORPUS_DOC_CONCURRENCY || 1
);
const POLL_MS = 5000;
const CORPUS_REPORT_DIR = path.join(config.REPORT_DIR, "corpus");
const CORPUS_JOBS_DIR = path.join(config.STORAGE_DIR, "jobs-corpus");

const jobs = new Map();

function persistCorpusJob(job) {
  fs.mkdirSync(CORPUS_JOBS_DIR, { recursive: true });
  const file = path.join(CORPUS_JOBS_DIR, `${job.id}.json`);
  const tmp = `${file}.tmp`;
  fs.writeFileSync(
    tmp,
    JSON.stringify({
      id: job.id,
      status: job.status,
      createdAt: job.createdAt,
      task: job.task,
      reportType: job.reportType,
      documents: job.documents,
      childJobIds: job.childJobIds,
      progress: job.progress,
      result: job.result,
      error: job.error,
    })
  );
  fs.renameSync(tmp, file); // atomar
}

function loadAllCorpusJobs() {
  if (!fs.existsSync(CORPUS_JOBS_DIR)) return [];
  const out = [];
  for (const entry of fs.readdirSync(CORPUS_JOBS_DIR)) {
    if (!entry.endsWith(".json")) continue;
    try {
      out.push(
        JSON.parse(
          fs.readFileSync(path.join(CORPUS_JOBS_DIR, entry), "utf8")
        )
      );
    } catch {
      /* korrupt — überspringen */
    }
  }
  return out;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

class CorpusPipeline {
  static start({
    pdfPaths = [],
    task,
    reportType = null,
    factCriteria = null,
    deepScan = false,
  }) {
    if (!Array.isArray(pdfPaths) || pdfPaths.length < 2)
      throw new Error(
        "Korpus-Analyse benötigt mindestens 2 PDF-Pfade (pdfPaths)."
      );
    if (!task) throw new Error("task ist erforderlich.");

    const jobId = uuidv4();
    const job = {
      id: jobId,
      status: "running",
      cancelled: false,
      createdAt: new Date().toISOString(),
      task,
      reportType,
      factCriteria,
      deepScan: !!deepScan,
      documents: pdfPaths.map((p) => path.basename(p)),
      pdfPaths,
      childJobIds: [],
      progress: {
        phase: "analyzing-documents",
        docsDone: 0,
        docsTotal: pdfPaths.length,
      },
      result: null,
      error: null,
    };
    jobs.set(jobId, job);
    persistCorpusJob(job);
    this._run(job).catch((e) => {
      job.status = "failed";
      job.error = e.message;
      persistCorpusJob(job);
    });
    return { jobId };
  }

  static async _run(job) {
    // Phase 1+2 — Einzel-Analysen gestaffelt starten und abwarten
    const docResults = [];
    const queue = [...job.pdfPaths];
    const active = new Map(); // childJobId -> pdfPath

    while ((queue.length || active.size) && !job.cancelled) {
      // Nachschieben bis DOC_CONCURRENCY erreicht (429 der Einzel-Pipeline
      // respektieren: bei "Maximale Anzahl..." einfach später erneut versuchen)
      while (queue.length && active.size < DOC_CONCURRENCY) {
        const pdfPath = queue[0];
        try {
          const { jobId: childId } = PdfAnalysisPipeline.start({
            pdfPath,
            task: job.task,
            reportType: job.reportType,
            factCriteria: job.factCriteria,
            deepScan: job.deepScan,
          });
          job.childJobIds.push(childId);
          active.set(childId, pdfPath);
          queue.shift();
          persistCorpusJob(job);
        } catch (e) {
          if (e.statusCode === 429) break; // Slots voll — beim nächsten Poll erneut
          // Harter Fehler für dieses Dokument (z.B. Pfad ungültig)
          docResults.push({
            documentName: path.basename(pdfPath),
            error: e.message,
            masterSummary: "",
            findings: [],
          });
          queue.shift();
          job.progress.docsDone++;
        }
      }

      await sleep(POLL_MS);

      // Abgeschlossene Kinder einsammeln
      for (const [childId, pdfPath] of [...active.entries()]) {
        const status = PdfAnalysisPipeline.getStatus(childId);
        if (!status || ["completed", "failed"].includes(status.status)) {
          active.delete(childId);
          job.progress.docsDone++;
          if (status?.status === "completed") {
            const result = PdfAnalysisPipeline.getResult(childId);
            const facts = PdfAnalysisPipeline.factStore
              .search({ document: path.basename(pdfPath), limit: 200 })
              .filter((f) => f.source.jobId === childId);
            docResults.push({
              documentName: path.basename(pdfPath),
              masterSummary: result.masterSummary || "",
              findings: facts.map((f) => ({
                statement: f.detail,
                pages: [f.source.page],
              })),
              childJobId: childId,
            });
          } else {
            docResults.push({
              documentName: path.basename(pdfPath),
              error: status?.error || "Einzel-Analyse fehlgeschlagen.",
              masterSummary: "",
              findings: [],
            });
          }
          persistCorpusJob(job);
        }
      }
    }

    if (job.cancelled) {
      for (const childId of active.keys())
        PdfAnalysisPipeline.cancel(childId);
      throw new Error("Korpus-Job abgebrochen.");
    }

    const usable = docResults.filter((d) => !d.error && d.masterSummary);
    if (usable.length < 2)
      throw new Error(
        `Zu wenige erfolgreich analysierte Dokumente für einen Vergleich (${usable.length}/2).`
      );

    // Phase 3 — Vergleichs-Synthese + konsolidierter Report
    job.progress.phase = "comparing";
    persistCorpusJob(job);
    const { report, comparison } = await compareCorpus(usable, job.task);

    fs.mkdirSync(CORPUS_REPORT_DIR, { recursive: true });
    const reportFile = path.join(CORPUS_REPORT_DIR, `${job.id}.md`);
    fs.writeFileSync(reportFile, report);

    job.result = {
      reportFile,
      comparison,
      documentsAnalyzed: usable.length,
      documentsFailed: docResults.length - usable.length,
      childJobIds: job.childJobIds,
    };
    job.status = "completed";
    job.progress.phase = "done";
    persistCorpusJob(job);
  }

  static restorePersisted() {
    for (const snapshot of loadAllCorpusJobs()) {
      if (jobs.has(snapshot.id)) continue;
      const job = { ...snapshot, cancelled: false };
      if (job.status === "running") {
        job.status = "failed";
        job.error =
          "Durch Server-Neustart unterbrochen — Einzel-Analysen wurden ggf. fortgesetzt " +
          "(siehe Analyse-Jobs); Korpus-Vergleich bitte erneut starten.";
        persistCorpusJob(job);
      }
      jobs.set(job.id, job);
    }
  }

  static getStatus(jobId) {
    const job = jobs.get(jobId);
    if (!job) return null;
    const { id, status, progress, error, createdAt, task, documents } = job;
    return { id, status, progress, error, createdAt, task, documents };
  }

  static getResult(jobId) {
    const job = jobs.get(jobId);
    if (!job) return null;
    if (job.status !== "completed")
      return { status: job.status, error: job.error };
    const report =
      job.result?.reportFile && fs.existsSync(job.result.reportFile)
        ? fs.readFileSync(job.result.reportFile, "utf8")
        : null;
    return { status: "completed", ...job.result, report };
  }

  static list() {
    return [...jobs.values()].map((j) => CorpusPipeline.getStatus(j.id));
  }

  static cancel(jobId) {
    const job = jobs.get(jobId);
    if (!job) return false;
    job.cancelled = true;
    return true;
  }
}

module.exports = { CorpusPipeline };
