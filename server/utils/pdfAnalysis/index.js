// SPDX-License-Identifier: MIT
/**
 * PdfAnalysisPipeline — autonomer Orchestrator.
 *
 * NEU gegenüber Schritt 8:
 *  - Jobs werden via JobStore auf Disk persistiert (atomar).
 *  - resumeInterrupted(): beim Serverstart unterbrochene Jobs automatisch
 *    fortsetzen (Chunk-Checkpoints sorgen dafür, dass bereits analysierte
 *    Chunks NICHT erneut berechnet werden).
 *  - Adaptive Parallelität: progress.concurrency zeigt die aktuelle
 *    AIMD-geregelte Agenten-Anzahl live an.
 */
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const config = require("./config");
const { PdfReader, buildChunkPlan } = require("./pdfReader");
const { runPool, clearCheckpoint } = require("./agentPool");
const { analyzeChunk } = require("./analysisAgent");
const { synthesize } = require("./synthesizer");
const { FactStore } = require("./factStore");
const { persistJob, loadAllJobs } = require("./jobStore");

const jobs = new Map();

class PdfAnalysisPipeline {
  static factStore = new FactStore();

  static activeCount() {
    return [...jobs.values()].filter((j) =>
      ["pending", "running"].includes(j.status)
    ).length;
  }

  /**
   * Beim Serverstart einmal aufrufen: lädt persistierte Jobs und setzt
   * unterbrochene (pending/running) automatisch fort.
   */
  static resumeInterrupted() {
    for (const snapshot of loadAllJobs()) {
      if (jobs.has(snapshot.id)) continue;
      const job = { ...snapshot, cancelled: false };
      jobs.set(job.id, job);
      if (["pending", "running"].includes(job.status)) {
        if (!fs.existsSync(job.pdfPath)) {
          job.status = "failed";
          job.error = "PDF-Datei nach Neustart nicht mehr vorhanden.";
          persistJob(job);
          continue;
        }
        console.log(
          `[pdfAnalysis] Setze unterbrochenen Job fort: ${job.id} (${job.documentName})`
        );
        this._run(job).catch((e) => {
          job.status = "failed";
          job.error = e.message;
          persistJob(job);
        });
      }
    }
  }

  static start({ pdfPath, task, reportType = null, factCriteria = null }) {
    if (!pdfPath || !task)
      throw new Error("pdfPath und task sind erforderlich.");
    if (!fs.existsSync(pdfPath))
      throw new Error(`PDF nicht gefunden: ${pdfPath}`);
    if (this.activeCount() >= config.MAX_ACTIVE_JOBS)
      throw Object.assign(
        new Error("Maximale Anzahl paralleler Analyse-Jobs erreicht."),
        { statusCode: 429 }
      );

    const jobId = uuidv4();
    const job = {
      id: jobId,
      pdfPath,
      documentName: path.basename(pdfPath),
      task,
      reportType,
      factCriteria,
      status: "pending",
      cancelled: false,
      createdAt: new Date().toISOString(),
      progress: {
        phase: "init",
        chunksDone: 0,
        chunksTotal: 0,
        totalPages: 0,
        concurrency: config.AGENT_CONCURRENCY,
      },
      result: null,
      error: null,
    };
    jobs.set(jobId, job);
    persistJob(job);
    this._run(job).catch((e) => {
      job.status = "failed";
      job.error = e.message;
      persistJob(job);
    });
    return { jobId };
  }

  static async _run(job) {
    job.status = "running";
    persistJob(job);
    const reader = new PdfReader(job.pdfPath);
    try {
      // Phase 1 — Dokument öffnen + Chunk-Plan
      job.progress.phase = "reading";
      const totalPages = await reader.open();
      if (config.MAX_PAGES > 0 && totalPages > config.MAX_PAGES)
        throw new Error(
          `Dokument hat ${totalPages} Seiten, Limit ist ${config.MAX_PAGES}.`
        );
      const chunks = buildChunkPlan(
        totalPages,
        config.PAGES_PER_CHUNK,
        config.CHUNK_OVERLAP_PAGES
      );
      job.progress.totalPages = totalPages;
      job.progress.chunksTotal = chunks.length;
      persistJob(job);

      // Phase 2 — parallele Multi-Agenten-Analyse (adaptiv geregelt)
      job.progress.phase = "analyzing";
      let lastPersist = Date.now();
      const chunkResults = await runPool(
        chunks,
        config.AGENT_CONCURRENCY,
        async (chunk) => {
          const { text } = await reader.rangeText(
            chunk.pageStart,
            chunk.pageEnd
          );
          return analyzeChunk({
            chunk,
            text,
            task: job.task,
            factCriteria: job.factCriteria,
            documentName: job.documentName,
          });
        },
        {
          jobId: job.id,
          isCancelled: () => job.cancelled,
          onProgress: (done, total, concurrency) => {
            job.progress.chunksDone = done;
            job.progress.chunksTotal = total;
            job.progress.concurrency = concurrency;
            // Job-Snapshot gedrosselt persistieren (max. alle 10 s),
            // die feingranularen Chunk-Checkpoints schreibt der Pool selbst.
            if (Date.now() - lastPersist > 10_000) {
              persistJob(job);
              lastPersist = Date.now();
            }
          },
        }
      );

      // Phase 3 — Synthese / Best-Practices-Report
      job.progress.phase = "synthesizing";
      persistJob(job);
      const { report, masterSummary } = await synthesize(chunkResults, {
        task: job.task,
        reportType: job.reportType,
        documentName: job.documentName,
      });

      fs.mkdirSync(config.REPORT_DIR, { recursive: true });
      const reportFile = path.join(config.REPORT_DIR, `${job.id}.md`);
      fs.writeFileSync(reportFile, report);

      let pdfReport = null;
      try {
        const { ReportGenerator } = require("../reports");
        const generator = new ReportGenerator();
        pdfReport = await generator.generate({
          title: `Analysebericht: ${job.documentName}`,
          query: job.task,
          summary: report,
        });
      } catch {
        /* Reports-Modul optional */
      }

      // Phase 4 — Fakten mit Quellenbezug speichern
      job.progress.phase = "storing-facts";
      const facts = [];
      for (const r of chunkResults) {
        for (const f of r.facts || []) {
          if ((f.confidence ?? 0) < config.FACT_MIN_CONFIDENCE) continue;
          facts.push({
            detail: f.detail,
            quote: f.quote,
            tags: f.tags,
            confidence: f.confidence,
            source: {
              documentName: job.documentName,
              documentPath: job.pdfPath,
              page: f.page,
              jobId: job.id,
            },
          });
        }
      }
      const factsStored = this.factStore.addFacts(facts);

      job.result = {
        reportFile,
        pdfReport,
        masterSummary,
        totalPages,
        chunks: chunks.length,
        factsStored,
        chunkErrors: chunkResults.filter((r) => r && r.error).length,
      };
      job.status = "completed";
      job.progress.phase = "done";
      persistJob(job);
      clearCheckpoint(job.id);
    } finally {
      await reader.close();
    }
  }

  static getStatus(jobId) {
    const job = jobs.get(jobId);
    if (!job) return null;
    const { id, documentName, task, status, progress, error, createdAt } = job;
    return { id, documentName, task, status, progress, error, createdAt };
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
    return [...jobs.values()]
      .map((j) => PdfAnalysisPipeline.getStatus(j.id))
      .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
  }

  static cancel(jobId) {
    const job = jobs.get(jobId);
    if (!job) return false;
    job.cancelled = true;
    return true;
  }
}

module.exports = { PdfAnalysisPipeline };
