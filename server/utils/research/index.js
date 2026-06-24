// SPDX-License-Identifier: MIT
const consoleLogger = require("../logger/console.js");

/**
 * Deep Research Pipeline — multi-step research: search → fetch → extract → summarize.
 *
 * Docs: index.doc.md
 * Purpose: Orchestrates web search, politician DB lookup, content extraction,
 * and LLM summarization into a single async pipeline with progress tracking.
 */

const { v4: uuidv4 } = require("uuid");
const { SystemSettings } = require("../../models/systemSettings");
const { BoundedJobStore } = require("../boundedJobStore");

class ResearchPipeline {
  constructor() {
    this.activeJobs = new BoundedJobStore({
      maxJobs: parseInt(process.env.RESEARCH_MAX_JOBS, 10) || 100,
      maxActive: parseInt(process.env.RESEARCH_MAX_ACTIVE, 10) || 10,
      ttlMs: (parseInt(process.env.RESEARCH_TTL_MINUTES, 10) || 30) * 60_000,
    });
  }

  log(text, ...args) {
    // eslint-disable-next-line no-console
    consoleLogger.log(`\x1b[38;5;208m[ResearchPipeline]\x1b[0m ${text}`, ...args);
  }

  /**
   * Start a new research job.
   * @param {Object} params
   * @param {string} params.query - research question
   * @param {string} [params.depth="quick"] - "quick" (1 search) or "deep" (3+ searches)
   * @param {string[]} [params.sources=["web","politician"]] - which sources to search
   * @param {string} [params.workspaceId] - optional workspace to attach results
   * @returns {Promise<{jobId: string, status: string}>}
   */
  async startResearch({
    query,
    depth = "quick",
    sources = ["web", "politician"],
    workspaceId = null,
  }) {
    if (!query || !query.trim()) throw new Error("Query is required");

    const jobId = uuidv4();
    const job = {
      id: jobId,
      query,
      depth,
      sources,
      workspaceId,
      status: "pending",
      progress: 0,
      steps: [],
      results: {
        searchResults: [],
        extractedContent: [],
        politicianResults: [],
        summary: null,
      },
      createdAt: new Date(),
    };

    this.activeJobs.set(jobId, job);

    this.#runPipeline(jobId).catch((err) => {
      this.log(`Pipeline error for ${jobId}: ${err.message}`);
      const j = this.activeJobs.get(jobId);
      if (j) {
        j.status = "failed";
        j.error = err.message;
      }
    });

    return { jobId, status: "started" };
  }

  /**
   * Get the status of a research job.
   * @param {string} jobId
   * @returns {Object|null}
   */
  getStatus(jobId) {
    const job = this.activeJobs.get(jobId);
    if (!job) return null;
    return {
      jobId: job.id,
      query: job.query,
      depth: job.depth,
      sources: job.sources,
      status: job.status,
      progress: job.progress,
      steps: job.steps,
      error: job.error || null,
      createdAt: job.createdAt,
    };
  }

  /**
   * Get the results of a completed research job.
   * @param {string} jobId
   * @returns {Object|null}
   */
  getResults(jobId) {
    const job = this.activeJobs.get(jobId);
    if (!job) return null;
    if (job.status !== "completed")
      return { status: job.status, progress: job.progress };
    return {
      jobId: job.id,
      query: job.query,
      summary: job.results.summary,
      sources:
        job.results.searchResults.length + job.results.politicianResults.length,
      searchResults: job.results.searchResults.slice(0, 20),
      politicianResults: job.results.politicianResults.slice(0, 10),
      extractedContent: job.results.extractedContent.slice(0, 10),
    };
  }

  // ── Pipeline Steps ──────────────────────────────────────

  /**
   * Run the full pipeline asynchronously.
   * @param {string} jobId
   */
  async #runPipeline(jobId) {
    const job = this.activeJobs.get(jobId);
    if (!job) return;

    try {
      // Step 1: Search
      job.status = "searching";
      job.progress = 10;
      const searchStep = {
        name: "search",
        status: "running",
        startedAt: new Date(),
      };
      job.steps.push(searchStep);

      // ── Vane fast path: answer engine handles search+extract+summarize ──
      const vaneResult = await this.#vaneFastPath(job);
      if (vaneResult) {
        job.results.searchResults = vaneResult.searchResults;
        searchStep.status = "completed";
        searchStep.completedAt = new Date();
        job.progress = 60;

        // Politician DB still runs — Vane does not know it
        if (job.sources.includes("politician")) {
          job.results.politicianResults = await this.#politicianSearch(
            job.query,
          );
        }

        job.results.summary = vaneResult.summary;
        job.steps.push({
          name: "vane-answer",
          status: "completed",
          startedAt: new Date(),
          completedAt: new Date(),
        });
        job.progress = 100;
        job.status = "completed";
        this.log(
          `Research completed via Vane: ${jobId} — ${job.results.searchResults.length} sources`,
        );
        return;
      }

      const searchQueries = this.#expandQuery(job.query, job.depth);
      const allSearchResults = [];

      for (const sq of searchQueries) {
        if (job.sources.includes("web")) {
          const webResults = await this.#webSearch(sq);
          allSearchResults.push(...webResults);
        }
        if (job.sources.includes("politician")) {
          const polResults = await this.#politicianSearch(sq);
          job.results.politicianResults.push(...polResults);
        }
      }

      job.results.searchResults = allSearchResults;
      searchStep.status = "completed";
      searchStep.completedAt = new Date();
      job.progress = 40;

      // Step 2: Extract content from top URLs
      job.status = "extracting";
      const extractStep = {
        name: "extract",
        status: "running",
        startedAt: new Date(),
      };
      job.steps.push(extractStep);

      const topUrls = allSearchResults
        .filter((r) => r.link)
        .slice(0, job.depth === "deep" ? 8 : 3);

      for (const result of topUrls) {
        try {
          const content = await this.#extractContent(result.link);
          if (content) {
            job.results.extractedContent.push({
              url: result.link,
              title: result.title,
              content: content.substring(0, 5000),
            });
          }
        } catch (err) {
          this.log(`Extract error for ${result.link}: ${err.message}`);
        }
      }

      extractStep.status = "completed";
      extractStep.completedAt = new Date();
      job.progress = 70;

      // Step 3: Summarize with LLM
      job.status = "summarizing";
      const summarizeStep = {
        name: "summarize",
        status: "running",
        startedAt: new Date(),
      };
      job.steps.push(summarizeStep);

      const summary = await this.#summarize(job);
      job.results.summary = summary;

      summarizeStep.status = "completed";
      summarizeStep.completedAt = new Date();
      job.progress = 100;
      job.status = "completed";

      this.log(
        `Research completed: ${jobId} — ${job.results.searchResults.length} results, ${job.results.extractedContent.length} extracted`,
      );
    } catch (err) {
      job.status = "failed";
      job.error = err.message;
      this.log(`Pipeline failed for ${jobId}: ${err.message}`);
    }
  }

  /**
   * Expand a query into multiple search queries for deep research.
   * @param {string} query
   * @param {string} depth
   * @returns {string[]}
   */
  #expandQuery(query, depth) {
    if (depth === "quick") return [query];

    const expansions = [query];
    const keywords = query.split(/\s+/).filter((w) => w.length > 3);
    if (keywords.length > 2) {
      expansions.push(keywords.slice(0, 3).join(" ") + " Bundestag");
      expansions.push(keywords.slice(0, 3).join(" ") + " AfD Position");
    }
    return expansions;
  }

  /**
   * Search the web using the configured search provider.
   * @param {string} query
   * @returns {Promise<Array<{title: string, link: string, snippet: string}>>}
   */
  async #webSearch(query) {
    try {
      const provider =
        (await SystemSettings.get({ label: "agent_search_provider" }))?.value ??
        "unknown";
      const searchEngine = this.#getSearchEngine(provider);
      if (!searchEngine) {
        this.log(
          `No search engine configured (provider: ${provider}), using fallback`,
        );
        return [];
      }
      const results = await searchEngine(query);
      return Array.isArray(results) ? results : [];
    } catch (err) {
      this.log(`Web search error: ${err.message}`);
      return [];
    }
  }

  /**
   * Get the appropriate search function based on provider.
   * Delegates to the existing web-browsing plugin's search infrastructure.
   * @param {string} provider
   * @returns {Function|null}
   */
  #getSearchEngine(_provider) {
    const { WebSearchEngine } = require("./webSearchEngine");
    return WebSearchEngine.search.bind(WebSearchEngine);
  }

  /**
   * Fast path: let the Vane sidecar answer directly (search + extract +
   * summarize in one call). Returns null if Vane is unavailable, so the
   * classic pipeline runs as fallback.
   * @param {Object} job
   * @returns {Promise<{summary: string, searchResults: Array}|null>}
   */
  async #vaneFastPath(job) {
    try {
      const provider =
        (await SystemSettings.get({ label: "agent_search_provider" }))?.value ??
        "unknown";
      if (provider !== "vane") return null;

      const { VaneClient } = require("./vaneClient");
      if (!(await VaneClient.isAvailable())) return null;

      const result = await VaneClient.answer(job.query, {
        optimizationMode: job.depth === "deep" ? "quality" : "balanced",
        sources: ["web"],
      });
      if (!result || !result.message) return null;

      return {
        summary: result.message,
        searchResults: result.sources
          .filter((s) => s.metadata?.url)
          .map((s) => ({
            title: s.metadata.title || s.metadata.url,
            link: s.metadata.url,
            snippet: (s.content || "").substring(0, 300),
          })),
      };
    } catch (err) {
      this.log(`Vane fast path error: ${err.message}`);
      return null;
    }
  }

  /**
   * Search the politician database.
   * @param {string} query
   * @returns {Promise<Array<Object>>}
   */
  async #politicianSearch(query) {
    try {
      const { PoliticianDB } = require("../politician");
      const db = new PoliticianDB();
      const results = await db.searchPoliticians(query);
      return results.slice(0, 10);
    } catch (err) {
      this.log(`Politician search error: ${err.message}`);
      return [];
    }
  }

  /**
   * Extract content from a URL using the existing web-scraping infrastructure.
   * @param {string} url
   * @returns {Promise<string|null>}
   */
  async #extractContent(url) {
    try {
      const { ContentExtractor } = require("./contentExtractor");
      return await ContentExtractor.extract(url);
    } catch (err) {
      this.log(`Content extraction error for ${url}: ${err.message}`);
      return null;
    }
  }

  /**
   * Summarize research results using LLM.
   * @param {Object} job
   * @returns {Promise<string>}
   */
  async #summarize(job) {
    try {
      const { LLMSummarizer } = require("./summarizer");
      return await LLMSummarizer.summarize({
        query: job.query,
        searchResults: job.results.searchResults,
        extractedContent: job.results.extractedContent,
        politicianResults: job.results.politicianResults,
      });
    } catch (err) {
      this.log(`Summarization error: ${err.message}`);
      return this.#buildFallbackSummary(job);
    }
  }

  /**
   * Build a fallback summary when LLM is unavailable.
   * @param {Object} job
   * @returns {string}
   */
  #buildFallbackSummary(job) {
    const parts = [`# Recherche: ${job.query}\n`];

    if (job.results.searchResults.length) {
      parts.push("## Web-Ergebnisse");
      job.results.searchResults.slice(0, 10).forEach((r, i) => {
        parts.push(`${i + 1}. **${r.title}** — ${r.snippet || ""}`);
      });
    }

    if (job.results.politicianResults.length) {
      parts.push("\n## Politiker-Ergebnisse");
      job.results.politicianResults.slice(0, 5).forEach((p) => {
        parts.push(
          `- **${p.fullName}** (${p.party || "?"}) — ${p.faction || ""}, ${p.state || ""}`,
        );
      });
    }

    if (job.results.extractedContent.length) {
      parts.push("\n## Extrahierte Inhalte");
      job.results.extractedContent.slice(0, 3).forEach((c) => {
        parts.push(
          `### ${c.title || c.url}\n${c.content?.substring(0, 500)}...`,
        );
      });
    }

    return parts.join("\n");
  }

  /** List all active/completed research jobs. */
  listJobs() {
    return Array.from(this.activeJobs.values()).map((j) => ({
      jobId: j.id,
      query: j.query,
      status: j.status,
      progress: j.progress,
      createdAt: j.createdAt,
    }));
  }
}

ResearchPipeline._instance = null;

function getResearchPipeline() {
  if (!ResearchPipeline._instance) {
    ResearchPipeline._instance = new ResearchPipeline();
  }
  return ResearchPipeline._instance;
}

module.exports = { ResearchPipeline, getResearchPipeline };
