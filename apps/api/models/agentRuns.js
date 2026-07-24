// SPDX-License-Identifier: MIT
// Purpose: Data-access layer for agent_runs table.
//          Created by Phase 1 — persists run lifecycle for reconnect-safe SSE.
// Docs: agentRuns.doc.md

const prisma = require("../utils/prisma");
const { v4: uuidv4 } = require("uuid");

const AgentRuns = {
  /**
   * Create a new run record.
   * @param {{ workspaceId: number, parentRunId?: string|null, agentName: string, model?: string, turnId?: string|null }} params
   * @returns {Promise<{id: string}>}
   */
  async create({
    workspaceId,
    parentRunId = null,
    agentName,
    model = null,
    turnId = null,
  }) {
    const id = uuidv4();
    await prisma.agent_runs.create({
      data: {
        id,
        workspace_id: workspaceId,
        parent_run_id: parentRunId,
        agent_name: agentName,
        model,
        status: "running",
        turn_id: turnId,
        started_at: new Date(),
      },
    });
    return { id };
  },

  /**
   * Update run status.
   * @param {string} runId
   * @param {string} status - running | waiting_input | done | error | cancelled
   */
  async updateStatus(runId, status) {
    const endedAt = ["done", "error", "cancelled"].includes(status)
      ? new Date()
      : null;
    await prisma.agent_runs.update({
      where: { id: runId },
      data: { status, ...(endedAt ? { ended_at: endedAt } : {}) },
    });
  },

  /**
   * Get all active (non-terminal) runs for a workspace.
   * Used for SSE reconnect snapshots.
   * @param {number} workspaceId
   * @returns {Promise<Array>}
   */
  async getActive(workspaceId) {
    // Cap at 50: if a crash leaves many runs in a non-terminal state the SSE
    // reconnect snapshot must not pull unbounded rows into memory.
    return prisma.agent_runs.findMany({
      where: {
        workspace_id: workspaceId,
        status: { in: ["running", "waiting_input", "queued"] },
      },
      orderBy: { started_at: "asc" },
      take: 50,
    });
  },

  /**
   * Get recent runs (for history — Phase 4+).
   * @param {number} workspaceId
   * @param {number} limit
   */
  async getRecent(workspaceId, limit = 50) {
    return prisma.agent_runs.findMany({
      where: { workspace_id: workspaceId },
      orderBy: { started_at: "desc" },
      take: limit,
    });
  },
};

module.exports = { AgentRuns };
