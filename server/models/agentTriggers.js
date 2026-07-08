// SPDX-License-Identifier: MIT
// Purpose: Data-access layer for agent_triggers + trigger_runs tables.
//          Manages trigger CRUD, checkpoint storage, and run history.
// Docs: agentTriggers.doc.md

const prisma = require('../utils/prisma').default || require('../utils/prisma');
const { v4: uuidv4 } = require('uuid');

const AgentTriggers = {
  // ─── Trigger CRUD ───

  async create({ workspaceId, agentName, name, type, config }) {
    return prisma.agent_triggers.create({
      data: {
        id: uuidv4(),
        workspace_id: workspaceId,
        agent_name: agentName,
        name,
        type, // "schedule" | "polling"
        config: JSON.stringify(config),
        active: true,
      },
    });
  },

  async list(workspaceId) {
    const rows = await prisma.agent_triggers.findMany({
      where: { workspace_id: workspaceId },
      orderBy: { created_at: 'desc' },
    });
    return rows.map((r) => ({
      ...r,
      config: typeof r.config === 'string' ? JSON.parse(r.config) : r.config,
      checkpoint: r.checkpoint
        ? typeof r.checkpoint === 'string'
          ? JSON.parse(r.checkpoint)
          : r.checkpoint
        : null,
    }));
  },

  async get(triggerId) {
    const r = await prisma.agent_triggers.findUnique({
      where: { id: triggerId },
    });
    if (!r) return null;
    return {
      ...r,
      config: typeof r.config === 'string' ? JSON.parse(r.config) : r.config,
      checkpoint: r.checkpoint
        ? typeof r.checkpoint === 'string'
          ? JSON.parse(r.checkpoint)
          : r.checkpoint
        : null,
    };
  },

  async update(triggerId, patch) {
    const data = {};
    if (patch.name !== undefined) data.name = patch.name;
    if (patch.agentName !== undefined) data.agent_name = patch.agentName;
    if (patch.config !== undefined) data.config = JSON.stringify(patch.config);
    if (patch.active !== undefined) data.active = patch.active;
    if (patch.checkpoint !== undefined)
      data.checkpoint = JSON.stringify(patch.checkpoint);
    if (patch.lastRunAt !== undefined) data.last_run_at = patch.lastRunAt;
    if (patch.nextRunAt !== undefined) data.next_run_at = patch.nextRunAt;
    return prisma.agent_triggers.update({ where: { id: triggerId }, data });
  },

  async delete(triggerId) {
    return prisma.agent_triggers.delete({ where: { id: triggerId } });
  },

  async toggle(triggerId, active) {
    return prisma.agent_triggers.update({
      where: { id: triggerId },
      data: { active },
    });
  },

  // ─── Trigger Runs ───

  async createRun({ triggerId, dedupeKey }) {
    // Idempotency: if dedupe_key exists and is not terminal, skip
    if (dedupeKey) {
      const existing = await prisma.trigger_runs.findFirst({
        where: {
          dedupe_key: dedupeKey,
          status: { in: ['queued', 'running', 'done'] },
        },
      });
      if (existing) return { id: existing.id, deduplicated: true };
    }

    return prisma.trigger_runs.create({
      data: {
        id: uuidv4(),
        trigger_id: triggerId,
        status: 'queued',
        dedupe_key: dedupeKey || null,
      },
    });
  },

  async updateRun(runId, patch) {
    const data = {};
    if (patch.status !== undefined) data.status = patch.status;
    if (patch.attempt !== undefined) data.attempt = patch.attempt;
    if (patch.errorMessage !== undefined)
      data.error_message = patch.errorMessage;
    if (patch.result !== undefined) data.result = JSON.stringify(patch.result);
    if (patch.startedAt !== undefined) data.started_at = patch.startedAt;
    if (patch.endedAt !== undefined) data.ended_at = patch.endedAt;
    return prisma.trigger_runs.update({ where: { id: runId }, data });
  },

  async getRun(runId) {
    return prisma.trigger_runs.findUnique({ where: { id: runId } });
  },

  async listRuns(triggerId, limit = 20) {
    return prisma.trigger_runs.findMany({
      where: { trigger_id: triggerId },
      orderBy: { created_at: 'desc' },
      take: limit,
    });
  },

  // ─── Scheduler queries ───

  /**
   * Get all active schedule triggers that are due (next_run_at <= now).
   * Called by the Bree scheduler job.
   */
  async getDueScheduleTriggers() {
    return prisma.agent_triggers.findMany({
      where: {
        active: true,
        type: 'schedule',
        OR: [{ next_run_at: { lte: new Date() } }, { next_run_at: null }],
      },
    });
  },

  /**
   * Get all active polling triggers due for their next poll.
   */
  async getDuePollingTriggers() {
    return prisma.agent_triggers.findMany({
      where: {
        active: true,
        type: 'polling',
        OR: [{ next_run_at: { lte: new Date() } }, { next_run_at: null }],
      },
    });
  },
};

module.exports = { AgentTriggers };
