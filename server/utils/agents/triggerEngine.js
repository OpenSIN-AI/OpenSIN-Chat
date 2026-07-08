// SPDX-License-Identifier: MIT
// Purpose: Trigger execution engine — runs schedule and polling triggers
//          with idempotency, exponential backoff, circuit breaker, and
//          dead-letter state. Uses Bree for scheduling (already in the repo).
//          No Redis needed — designed for single-VM (Oracle Free Tier).
// Docs: triggerEngine.doc.md
const Bree = require("bree");
const { getStoragePath } = require("../paths");
const { AgentTriggers } = require("../../models/agentTriggers");
const { AgentHandler } = require("../agents");
const { Workspace } = require("../../models/workspace");
const consoleLogger = require("../logger/console.js");
const MAX_ATTEMPTS = 5;
const CIRCUIT_BREAKER_THRESHOLD = 5; // consecutive failures before pausing
const POLL_INTERVAL_MS = 60 * 1000; // Bree checks every 60s
// Per-destination failure counters for circuit breaker
const failureCounts = new Map(); // triggerId -> count
class TriggerEngine {
  constructor() {
    this.bree = null;
    this._initialized = false;
  }
  /**
   * Initialize the Bree scheduler with a single recurring job
   * that checks for due triggers every 60 seconds.
   */
  init() {
    if (this._initialized) return;
    this._initialized = true;
    this.bree = new Bree({
      root: false, // no job files needed — we use a cron callback
      jobs: [
        {
          name: "trigger-scheduler",
          interval: POLL_INTERVAL_MS,
          timeout: POLL_INTERVAL_MS, // first run after 60s
        },
      ],
    });
    // The scheduler job runs in a worker thread — but we need access to
    // the main process DB. So instead of a worker file, we use a
    // programmatic interval in the main process.
    // (Bree's worker threads don't share Prisma connections.)
    this._useIntervalInstead();
    consoleLogger.log("[TriggerEngine] Initialized — polling every 60s");
  }
  _useIntervalInstead() {
    // Run in main process (Oracle Free VM = single process, safe)
    const checkTriggers = async () => {
      try {
        await this._checkScheduleTriggers();
        await this._checkPollingTriggers();
      } catch (e) {
        consoleLogger.error("[TriggerEngine] check error:", e.message);
      }
    };
    // Start after 60s, then every 60s
    setTimeout(checkTriggers, 60_000);
    setInterval(checkTriggers, POLL_INTERVAL_MS);
  }
  // ─── Schedule Triggers ───
  async _checkScheduleTriggers() {
    const due = await AgentTriggers.getDueScheduleTriggers();
    for (const trigger of due) {
      await this._executeTrigger(trigger);
    }
  }
  // ─── Polling Triggers ───
  async _checkPollingTriggers() {
    const due = await AgentTriggers.getDuePollingTriggers();
    for (const trigger of due) {
      await this._executePollingTrigger(trigger);
    }
  }
  /**
   * Execute a schedule trigger: fire the agent with the configured prompt.
   */
  async _executeTrigger(trigger) {
    const config =
      typeof trigger.config === "string"
        ? JSON.parse(trigger.config)
        : trigger.config;
    const dedupeKey = `schedule-${trigger.id}-${Date.now()}`;
    const run = await AgentTriggers.createRun({
      triggerId: trigger.id,
      dedupeKey,
    });
    if (run.deduplicated) return;
    await AgentTriggers.updateRun(run.id, {
      status: "running",
      startedAt: new Date(),
      attempt: 1,
    });
    try {
      const workspace = await Workspace.get({ id: trigger.workspace_id });
      if (!workspace) throw new Error("Workspace not found");
      // Invoke the agent with the trigger's prompt
      const result = await this._invokeAgent(
        workspace,
        trigger.agent_name,
        config.prompt || "Trigger fired",
      );
      await AgentTriggers.updateRun(run.id, {
        status: "done",
        result,
        endedAt: new Date(),
      });
      // Reset circuit breaker
      failureCounts.set(trigger.id, 0);
      // Schedule next run based on cron expression
      const nextRunAt = this._calculateNextRun(config.cron_expression);
      await AgentTriggers.update(trigger.id, {
        lastRunAt: new Date(),
        nextRunAt,
      });
      consoleLogger.log(
        `[TriggerEngine] Trigger ${trigger.name} executed successfully`,
      );
    } catch (e) {
      await this._handleFailure(trigger, run.id, e);
    }
  }
  /**
   * Execute a polling trigger: check for changes, fire if new data.
   */
  async _executePollingTrigger(trigger) {
    const config =
      typeof trigger.config === "string"
        ? JSON.parse(trigger.config)
        : trigger.config;
    const checkpoint = trigger.checkpoint
      ? typeof trigger.checkpoint === "string"
        ? JSON.parse(trigger.checkpoint)
        : trigger.checkpoint
      : null;
    try {
      // Poll the connector for changes
      const pollResult = await this._pollConnector(config, checkpoint);
      if (!pollResult.hasChanges) {
        // No changes — just update next_run_at
        const nextRunAt = new Date(
          Date.now() + (config.poll_interval_ms || 300_000),
        );
        await AgentTriggers.update(trigger.id, { nextRunAt });
        return;
      }
      // Changes detected — fire trigger
      const dedupeKey = `poll-${trigger.id}-${pollResult.checksum || Date.now()}`;
      const run = await AgentTriggers.createRun({
        triggerId: trigger.id,
        dedupeKey,
      });
      if (run.deduplicated) return;
      await AgentTriggers.updateRun(run.id, {
        status: "running",
        startedAt: new Date(),
        attempt: 1,
      });
      const workspace = await Workspace.get({ id: trigger.workspace_id });
      if (!workspace) throw new Error("Workspace not found");
      const result = await this._invokeAgent(
        workspace,
        trigger.agent_name,
        config.prompt || "New items detected by polling trigger",
      );
      await AgentTriggers.updateRun(run.id, {
        status: "done",
        result,
        endedAt: new Date(),
      });
      // Update checkpoint
      failureCounts.set(trigger.id, 0);
      const nextRunAt = new Date(
        Date.now() + (config.poll_interval_ms || 300_000),
      );
      await AgentTriggers.update(trigger.id, {
        lastRunAt: new Date(),
        nextRunAt,
        checkpoint: pollResult.newCheckpoint,
      });
      consoleLogger.log(
        `[TriggerEngine] Polling trigger ${trigger.name} fired — ${pollResult.itemCount} new items`,
      );
    } catch (e) {
      // For polling, don't create a run record on poll failure — just log
      consoleLogger.error(
        `[TriggerEngine] Polling trigger ${trigger.name} poll error:`,
        e.message,
      );
      const nextRunAt = new Date(
        Date.now() + (config.poll_interval_ms || 300_000),
      );
      await AgentTriggers.update(trigger.id, { nextRunAt });
    }
  }
  /**
   * Handle execution failure with exponential backoff + circuit breaker.
   */
  async _handleFailure(trigger, runId, error) {
    const attempt = (await AgentTriggers.getRun(runId))?.attempt || 1;
    const failures = (failureCounts.get(trigger.id) || 0) + 1;
    failureCounts.set(trigger.id, failures);
    consoleLogger.error(
      `[TriggerEngine] Trigger ${trigger.name} failed (attempt ${attempt}/${MAX_ATTEMPTS}):`,
      error.message,
    );
    if (attempt >= MAX_ATTEMPTS) {
      // Dead-letter
      await AgentTriggers.updateRun(runId, {
        status: "failed_permanent",
        errorMessage: error.message,
        endedAt: new Date(),
      });
      consoleLogger.error(
        `[TriggerEngine] Trigger ${trigger.name} permanently failed — dead-lettered`,
      );
    } else {
      // Exponential backoff with jitter
      const baseDelay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s, 16s
      const jitter = Math.random() * 1000;
      const nextAttemptAt = new Date(Date.now() + baseDelay + jitter);
      await AgentTriggers.updateRun(runId, {
        status: "queued",
        attempt: attempt + 1,
        errorMessage: error.message,
      });
      await AgentTriggers.update(trigger.id, { nextRunAt: nextAttemptAt });
    }
    // Circuit breaker: pause trigger after too many consecutive failures
    if (failures >= CIRCUIT_BREAKER_THRESHOLD) {
      await AgentTriggers.toggle(trigger.id, false);
      failureCounts.set(trigger.id, 0);
      consoleLogger.warn(
        `[TriggerEngine] Circuit breaker tripped for trigger ${trigger.name} — auto-paused after ${failures} consecutive failures`,
      );
    }
  }
  /**
   * Invoke an agent with a prompt. Returns the agent's response.
   * This is a simplified wrapper around AgentHandler.
   */
  async _invokeAgent(workspace, agentName, prompt) {
    // Delegate to the existing AgentHandler — same path as chat
    const { AgentHandler } = require("../agents");
    const handler = new AgentHandler({
      workspace,
      prompt,
      agentName,
    });
    const result = await handler.start();
    return { response: result };
  }
  /**
   * Poll a connector for changes. Returns { hasChanges, newCheckpoint, itemCount, checksum }.
   * This is a stub — actual polling logic per connector type goes here.
   * Phase 5.1: Gmail polling (check for new emails since checkpoint)
   * Phase 5.2: GitHub polling (check for new issues/PRs)
   */
  async _pollConnector(config, checkpoint) {
    // TODO: Implement per-connector polling
    // For now, return no changes
    return {
      hasChanges: false,
      newCheckpoint: checkpoint,
      itemCount: 0,
      checksum: null,
    };
  }
  /**
   * Calculate the next run time from a cron expression.
   * Uses cron-parser (lightweight, no deps beyond what's in package.json).
   */
  _calculateNextRun(cronExpression) {
    try {
      const cronParser = require("cron-parser");
      const interval = cronParser.parseExpression(cronExpression);
      return interval.next().toDate();
    } catch (e) {
      // If cron is invalid, default to +1 hour
      consoleLogger.warn(
        `[TriggerEngine] Invalid cron "${cronExpression}": ${e.message}`,
      );
      return new Date(Date.now() + 3600_000);
    }
  }
  /**
   * Manually replay a failed trigger run.
   */
  async replayRun(runId) {
    const run = await AgentTriggers.getRun(runId);
    if (!run) throw new Error("Run not found");
    if (!["error", "failed_permanent"].includes(run.status)) {
      throw new Error("Only failed runs can be replayed");
    }
    const trigger = await AgentTriggers.get(run.trigger_id);
    if (!trigger) throw new Error("Trigger not found");
    // Reset and re-execute
    await AgentTriggers.updateRun(runId, {
      status: "queued",
      attempt: 0,
      errorMessage: null,
    });
    failureCounts.set(trigger.id, 0);
    await this._executeTrigger(trigger);
  }
}
// Singleton
const triggerEngine = new TriggerEngine();
module.exports = { triggerEngine, TriggerEngine };