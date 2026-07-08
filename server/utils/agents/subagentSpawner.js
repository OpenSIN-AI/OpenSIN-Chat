// SPDX-License-Identifier: MIT
// Purpose: Subagent spawning API. Allows an agent to spawn child agents
//          with isolated run context (own AIbitat, own chat history, own
//          scratch directory). Child runs are linked to parent via
//          parent_run_id and appear in the Agent Sessions tree.
//          Modeled after Traycer's agent-to-agent lineage model.
// Docs: subagentSpawner.doc.md

const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs");
const { agentRunBus } = require("./runBus");
const { AgentRuns } = require("../../models/agentRuns");
const { Workspace } = require("../../models/workspace");
const consoleLogger = require("../logger/console.js");

/**
 * @class SubagentSpawner
 * @description Spawns child agent runs with isolated context.
 *              Each subagent gets:
 *              - Its own agent_runs record with parent_run_id
 *              - Its own AIbitat instance (separate chat history, model, system prompt)
 *              - Its own scratch directory (storage/agent-runs/<runId>/)
 *              - Events published to runBus (visible in Agent Sessions tree)
 */
class SubagentSpawner {
  /**
   * Spawn a subagent.
   * @param {Object} params
   * @param {string} params.parentRunId - UUID of the parent run
   * @param {number} params.workspaceId - Workspace ID
   * @param {string} params.workspaceSlug - Workspace slug (for runBus events)
   * @param {string} params.agentName - Name/identifier of the agent to spawn
   * @param {string} params.prompt - The prompt to send to the subagent
   * @param {string} [params.model] - Override model for subagent
   * @param {Object} [params.agentConfig] - Additional agent configuration
   * @param {string} [params.parentAgentName] - Name of parent agent (for logging)
   * @returns {Promise<{ runId: string, result: any }>}
   */
  async spawn({
    parentRunId,
    workspaceId,
    workspaceSlug,
    agentName,
    prompt,
    model = null,
    agentConfig = {},
    parentAgentName: _parentAgentName = "Parent Agent",
  }) {
    const runId = uuidv4();

    // 1) Create run record with parent linkage
    await AgentRuns.create({
      workspaceId,
      parentRunId,
      agentName,
      model,
    });

    // 2) Create isolated scratch directory
    const scratchDir = this._createScratchDir(runId);

    // 3) Publish spawn event (appears as child in Agent Sessions tree)
    agentRunBus.publish(workspaceSlug, "run.started", {
      runId,
      parentRunId,
      agentName,
      model,
      status: "running",
      ts: Date.now(),
    });

    consoleLogger.log(
      `[SubagentSpawner] Spawned subagent "${agentName}" (run ${runId}) under parent ${parentRunId}`,
    );

    try {
      // 4) Create isolated AIbitat instance for the subagent
      const result = await this._runIsolated({
        runId,
        workspaceId,
        workspaceSlug,
        agentName,
        prompt,
        model,
        agentConfig,
        scratchDir,
      });

      // 5) Publish completion
      agentRunBus.publish(workspaceSlug, "run.finished", {
        runId,
        status: "done",
        ts: Date.now(),
      });
      await AgentRuns.updateStatus(runId, "done");

      return { runId, result };
    } catch (e) {
      agentRunBus.publish(workspaceSlug, "run.finished", {
        runId,
        status: "error",
        ts: Date.now(),
      });
      await AgentRuns.updateStatus(runId, "error");
      consoleLogger.error(
        `[SubagentSpawner] Subagent "${agentName}" failed:`,
        e.message,
      );
      throw e;
    } finally {
      // 6) Clean up scratch dir (optional — keep for debugging)
      // this._cleanupScratchDir(scratchDir);
    }
  }

  /**
   * Run an agent in an isolated context.
   * Creates a fresh AgentHandler with its own AIbitat, chat history, and
   * tool set. The subagent does NOT share state with the parent.
   * @private
   */
  async _runIsolated({
    runId,
    workspaceId,
    workspaceSlug,
    agentName,
    prompt,
    model,
    agentConfig,
    scratchDir,
  }) {
    // Lazy-load AgentHandler to avoid circular deps
    const { AgentHandler } = require("./index");

    const workspace = await Workspace.get({ id: workspaceId });
    if (!workspace) throw new Error(`Workspace ${workspaceId} not found`);

    // Create a NEW AgentHandler instance — completely isolated from parent
    const handler = new AgentHandler({
      workspace,
      prompt,
      agentName,
      model: model || undefined,
      // Pass through any extra config (system prompt override, tool scope, etc.)
      ...agentConfig,
    });

    // Attach runId + workspaceSlug to the handler so AIbitat hooks
    // can publish events to the correct runBus channel
    handler._runId = runId;
    handler._workspaceSlug = workspaceSlug;
    handler._parentRunId = null; // This IS the subagent — its children would be grandchildren
    handler._scratchDir = scratchDir;

    // Hook introspect to publish log events for this subagent
    this._hookEvents(handler, runId, workspaceSlug);

    // Start the agent
    const result = await handler.start();
    return result;
  }

  /**
   * Hook AIbitat events to the runBus for this subagent run.
   * @private
   */
  _hookEvents(_handler, _runId, _workspaceSlug) {
    // We hook after handler.start() initializes the AIbitat instance.
    // The handler should expose its aibitat instance for hooking.
    // This is called from _runIsolated after handler creation but before start().
    // The actual hooking happens in the AgentHandler when it creates AIbitat
    // — it checks for _runId and _workspaceSlug and hooks accordingly.
    // (See integration guide: AIbitat hooks in agentHandler)
  }

  /**
   * Create an isolated scratch directory for this run.
   * @private
   */
  _createScratchDir(runId) {
    const { getStoragePath } = require("../paths");
    const dir = path.join(getStoragePath("agent-runs"), runId);
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (e) {
      consoleLogger.warn(
        `[SubagentSpawner] Failed to create scratch dir: ${e.message}`,
      );
    }
    return dir;
  }

  /**
   * Clean up scratch directory after run.
   * @private
   */
  _cleanupScratchDir(dir) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {}
  }

  /**
   * Spawn multiple subagents in parallel.
   * All children share the same parentRunId.
   * @param {Object} params - same as spawn(), but `agents` is an array
   * @param {Array} params.agents - [{ agentName, prompt, model?, agentConfig? }]
   * @returns {Promise<Array>} - [{ runId, result }] in same order as input
   */
  async spawnParallel({ parentRunId, workspaceId, workspaceSlug, agents }) {
    const promises = agents.map((a) =>
      this.spawn({
        parentRunId,
        workspaceId,
        workspaceSlug,
        agentName: a.agentName,
        prompt: a.prompt,
        model: a.model,
        agentConfig: a.agentConfig,
      }).catch((e) => ({ runId: null, result: null, error: e.message })),
    );
    return Promise.all(promises);
  }
}

// Singleton
const subagentSpawner = new SubagentSpawner();

module.exports = { subagentSpawner, SubagentSpawner };
