// SPDX-License-Identifier: MIT
/**
 * PdfAnalysisPipeline — autonomer Orchestrator.
 *
 * Der Nutzer gibt nur an: PDF, Auftrag, (optional) Berichtstyp und
 * Fakten-Kriterien. Alles Weitere läuft selbstständig:
 *   1. PDF öffnen, Chunk-Plan erstellen (Seiten + Überlappung)
 *   2. Parallel-Analyse via AgentPool (Wellen, Checkpoints, Resume)
 *   3. Hierarchische Synthese → Best-Practices-Report (Markdown, optional PDF)
 *   4. Selektierte Fakten mit Quellenbezug in den FactStore schreiben
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

const jobs = new Map(); // in-memory Job-Registry (wie research/-Modul)

class PdfAnalysisPipeline {
  static factStore = new FactStore();

  static activeCount() {
    return [...jobs.values()].filter((j) =>
      ["pending", "running"].includes(j.status)
    ).length;
  }

  /**
   * Startet einen Analyse-Job. Gibt sofort { jobId } zurück (asynchron).
   * @param {Object} params { pdfPath, task, reportType?, factCriteria? }
   */
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
      progress: { phase: "init", chunksDone: 0, chunksTotal: 0, totalPages: 0 },
      result: null,
      error: null,
    };
    jobs.set(jobId, job);
    this._run(job).catch((e) => {
      job.status = "failed";
      job.error = e.message;
    });
    return { jobId };
  }

  static async _run(job) {
    job.status = "running";
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

      // Phase 2 — parallele Multi-Agenten-Analyse
      job.progress.phase = "analyzing";
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
          onProgress: (done, total) => {
            job.progress.chunksDone = done;
            job.progress.chunksTotal = total;
          },
        }
      );

      // Phase 3 — Synthese / Best-Practices-Report
      job.progress.phase = "synthesizing";
      const { report, masterSummary } = await synthesize(chunkResults, {
        task: job.task,
        reportType: job.reportType,
        documentName: job.documentName,
      });

      fs.mkdirSync(config.REPORT_DIR, { recursive: true });
      const reportFile = path.join(config.REPORT_DIR, `${job.id}.md`);
      fs.writeFileSync(reportFile, report);

      // Optional: druckfertiges PDF über das bestehende Reports-Modul (Modul 3)
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
        /* Reports-Modul optional — Markdown-Report existiert immer */
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
        chunkErrors: chunkResults.filter((r) => r.error).length,
      };
      job.status = "completed";
      job.progress.phase = "done";
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
    const report = fs.existsSync(job.result.reportFile)
      ? fs.readFileSync(job.result.reportFile, "utf8")
      : null;
    return { status: "completed", ...job.result, report };
  }

  static list() {
    return [...jobs.values()].map((j) => PdfAnalysisPipeline.getStatus(j.id));
  }

  static cancel(jobId) {
    const job = jobs.get(jobId);
    if (!job) return false;
    job.cancelled = true;
    return true;
  }
}

module.exports = { PdfAnalysisPipeline };
