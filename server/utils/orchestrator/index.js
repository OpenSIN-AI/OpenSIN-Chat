// SPDX-License-Identifier: MIT
/**
 * Unified Agent Orchestrator — coordinates multiple OpenSIN-Chat modules
 * (PoliticianDB, Deep Research, PDF Reports, Browser Agent) into
 * goal-driven workflows.
 *
 * Docs: index.doc.md
 * Purpose: Provides a single entry point for complex multi-step tasks like
 * "Research AfD's position on X, find relevant politicians, and generate a PDF report".
 */

const { v4: uuidv4 } = require("uuid");
const { BoundedJobStore } = require("../boundedJobStore");

class AgentOrchestrator {
  constructor() {
    this.activeWorkflows = new BoundedJobStore({
      maxJobs: parseInt(process.env.ORCHESTRATOR_MAX_WORKFLOWS, 10) || 50,
      maxActive: parseInt(process.env.ORCHESTRATOR_MAX_ACTIVE, 10) || 5,
      ttlMs: (parseInt(process.env.ORCHESTRATOR_TTL_MINUTES, 10) || 30) * 60_000,
    });
  }

  log(text, ...args) {
    // eslint-disable-next-line no-console
    console.log(`\x1b[38;5;141m[Orchestrator]\x1b[0m ${text}`, ...args);
  }

  /**
   * Start a goal-driven workflow.
   * @param {Object} params
   * @param {string} params.goal - natural-language goal
   * @param {string[]} [params.steps] - explicit steps (auto-detected if omitted)
   * @param {Object} [params.options] - per-step options
   * @param {boolean} [params.autoRun=true] - start the async runner immediately
   * @returns {Promise<{workflowId: string, steps: Array}>}
   */
  async startWorkflow({ goal, steps: explicitSteps, options = {}, autoRun = true }) {
    if (!goal) throw new Error("Goal is required");

    const workflowId = uuidv4();
    const steps = explicitSteps || AgentOrchestrator.#inferSteps(goal);

      const workflow = {
      id: workflowId,
      goal,
      query: goal,
      steps: steps.map((s, i) => ({
        id: `step-${i}`,
        type: s.type,
        label: s.label,
        status: "pending",
        result: null,
        error: null,
      })),
      status: "pending",
      currentStep: 0,
      options,
      createdAt: new Date(),
    };

    this.activeWorkflows.set(workflowId, workflow);

    if (autoRun) {
      this.#runWorkflow(workflowId).catch((err) => {
        this.log(`Workflow error for ${workflowId}: ${err.message}`);
        const w = this.activeWorkflows.get(workflowId);
        if (w) {
          w.status = "failed";
          w.error = err.message;
        }
      });
    }

    return { workflowId, steps: workflow.steps.map((s) => ({ id: s.id, type: s.type, label: s.label })) };
  }

  /**
   * Get workflow status.
   */
  getStatus(workflowId) {
    const w = this.activeWorkflows.get(workflowId);
    if (!w) return null;
    return {
      workflowId: w.id,
      goal: w.goal,
      status: w.status,
      currentStep: w.currentStep,
      totalSteps: w.steps.length,
      steps: w.steps.map((s) => ({ id: s.id, type: s.type, label: s.label, status: s.status, error: s.error })),
      error: w.error || null,
    };
  }

  /**
   * Get workflow results.
   */
  getResults(workflowId) {
    const w = this.activeWorkflows.get(workflowId);
    if (!w) return null;
    return {
      workflowId: w.id,
      goal: w.goal,
      status: w.status,
      steps: w.steps.map((s) => ({ id: s.id, type: s.type, label: s.label, status: s.status, result: s.result, error: s.error })),
    };
  }

  listWorkflows() {
    return Array.from(this.activeWorkflows.values()).map((w) => ({
      workflowId: w.id,
      goal: w.goal,
      status: w.status,
      currentStep: w.currentStep,
      totalSteps: w.steps.length,
      createdAt: w.createdAt,
    }));
  }

  // ── Workflow Execution ──────────────────────────

  async #runWorkflow(workflowId) {
    const w = this.activeWorkflows.get(workflowId);
    if (!w) return;

    w.status = "running";

    for (let i = 0; i < w.steps.length; i++) {
      w.currentStep = i;
      const step = w.steps[i];
      step.status = "running";

      try {
        step.result = await this.#executeStep(step.type, { query: w.query, ...step.result }, w.options, w.steps.slice(0, i));
        step.status = "completed";
        this.log(`Step ${i + 1}/${w.steps.length} completed: ${step.type}`);
      } catch (err) {
        step.status = "failed";
        step.error = err.message;
        this.log(`Step ${i + 1}/${w.steps.length} failed: ${step.type} — ${err.message}`);
        w.status = "failed";
        w.error = `Step "${step.label}" failed: ${err.message}`;
        return;
      }
    }

    w.status = "completed";
    this.log(`Workflow completed: ${workflowId}`);
  }

  async #executeStep(type, data, options, previousSteps) {
    switch (type) {
      case "search_politician":
        return await this.#stepSearchPolitician(data, options);
      case "deep_research":
        return await this.#stepDeepResearch(data, options, previousSteps);
      case "generate_report":
        return await this.#stepGenerateReport(data, options, previousSteps);
      case "extract_urls":
        return await this.#stepExtractUrls(data, options, previousSteps);
      default:
        throw new Error(`Unknown step type: ${type}`);
    }
  }

  // ── Step Implementations ──────────────────────────

  async #stepSearchPolitician(data, options) {
    const { PoliticianDB } = require("../politician");
    const db = new PoliticianDB();
    const query = options.politicianQuery || data.query;
    const results = await db.searchPoliticians(query);
    return { query, politicianResults: results.slice(0, 10) };
  }

  async #stepDeepResearch(data, options, previousSteps) {
    const { getResearchPipeline } = require("../research");
    const pipeline = getResearchPipeline();

    const query = options.researchQuery || data.query;
    const depth = options.researchDepth || "quick";
    const sources = options.researchSources || ["web", "politician"];

    const { jobId } = await pipeline.startResearch({ query, depth, sources });

    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const status = pipeline.getStatus(jobId);
      if (status?.status === "completed") {
        const results = pipeline.getResults(jobId);
        return { jobId, ...results };
      }
      if (status?.status === "failed") throw new Error(status.error || "Research failed");
    }
    throw new Error("Research timed out (120s)");
  }

  async #stepGenerateReport(data, options, previousSteps) {
    const { ReportGenerator } = require("../reports");

    const researchStep = previousSteps.find((s) => s.type === "deep_research" && s.result?.summary);
    const politicianStep = previousSteps.find((s) => s.type === "search_politician" && s.result?.politicianResults);

    const result = await ReportGenerator.generate({
      title: options.reportTitle || data.query || "Recherche-Bericht",
      query: data.query || "",
      summary: researchStep?.result?.summary || "",
      searchResults: researchStep?.result?.searchResults || [],
      politicianResults: politicianStep?.result?.politicianResults || researchStep?.result?.politicianResults || [],
      extractedContent: researchStep?.result?.extractedContent || [],
      template: options.reportTemplate || "standard",
    });

    return result;
  }

  async #stepExtractUrls(data, options, previousSteps) {
    const { ContentExtractor } = require("../research/contentExtractor");
    const researchStep = previousSteps.find((s) => s.type === "deep_research" && s.result?.searchResults);
    const urls = (researchStep?.result?.searchResults || [])
      .filter((r) => r.link)
      .slice(0, options.maxUrls || 5);

    const extracted = [];
    for (const u of urls) {
      const content = await ContentExtractor.extract(u.link);
      if (content) extracted.push({ url: u.link, title: u.title, content: content.substring(0, 5000) });
    }
    return { extractedContent: extracted };
  }

  // ── Step Inference ────────────────────────────────

  /**
   * Public wrapper around the internal step-inference heuristic.
   * @param {string} goal
   * @returns {Array<{type: string, label: string}>}
   */
  static inferSteps(goal) {
    return AgentOrchestrator.#inferSteps(goal);
  }

  static #inferSteps(goal) {
    const steps = [];
    const lower = goal.toLowerCase();

    const needsPoliticians = /politik|abgeordnet|bundestag|fraktion|afd|wahl|mandat|mdb/i.test(lower);
    const needsResearch = /recherche|research|untersuch|analyse|position|standpunkt|bericht|report|gutachten/i.test(lower);
    const needsReport = /bericht|report|pdf|dokument|gutachten|print/i.test(lower);
    const needsExtract = /detail|quelle|text|inhalt|auszug|extract|deep/i.test(lower);

    if (needsPoliticians) {
      steps.push({ type: "search_politician", label: "Politiker-Datenbank durchsuchen" });
    }

    if (needsResearch) {
      steps.push({
        type: "deep_research",
        label: needsExtract ? "Tiefenrecherche durchführen" : "Recherche durchführen",
      });
    }

    if (needsExtract && needsResearch) {
      steps.push({ type: "extract_urls", label: "Quellen extrahieren" });
    }

    if (needsReport) {
      steps.push({ type: "generate_report", label: "PDF-Bericht generieren" });
    }

    if (steps.length === 0) {
      steps.push({ type: "deep_research", label: "Recherche durchführen" });
      steps.push({ type: "generate_report", label: "PDF-Bericht generieren" });
    }

    return steps;
  }
}

AgentOrchestrator._instance = null;

function getOrchestrator() {
  if (!AgentOrchestrator._instance) {
    AgentOrchestrator._instance = new AgentOrchestrator();
  }
  return AgentOrchestrator._instance;
}

module.exports = { AgentOrchestrator, getOrchestrator };
