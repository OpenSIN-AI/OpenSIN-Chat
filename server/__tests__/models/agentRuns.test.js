// SPDX-License-Identifier: MIT
// Tests for the AgentRuns model (Punkt 5 — server test coverage).
// Covers: create, updateStatus, getActive, getRecent.
// Prisma is mocked per-test; no real DB connection is made.

jest.mock("../../utils/prisma", () => {
  const mockAgentRuns = {
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  };
  return {
    agent_runs: mockAgentRuns,
  };
});

jest.mock("uuid", () => ({
  v4: jest.fn(() => "test-run-uuid-1234"),
}));

const { AgentRuns } = require("../../models/agentRuns");
const prisma = require("../../utils/prisma");

describe("AgentRuns model", () => {
  afterEach(() => jest.clearAllMocks());

  // ── create ──────────────────────────────────────────────────────────
  describe("create", () => {
    it("creates a run with required fields and returns the id", async () => {
      prisma.agent_runs.create.mockResolvedValue({ id: "test-run-uuid-1234" });

      const result = await AgentRuns.create({
        workspaceId: 1,
        agentName: "DefaultAgent",
      });

      expect(result).toEqual({ id: "test-run-uuid-1234" });
      expect(prisma.agent_runs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            id: "test-run-uuid-1234",
            workspace_id: 1,
            agent_name: "DefaultAgent",
            status: "running",
            parent_run_id: null,
            model: null,
          }),
        }),
      );
    });

    it("passes parentRunId and model when provided", async () => {
      prisma.agent_runs.create.mockResolvedValue({ id: "test-run-uuid-1234" });

      await AgentRuns.create({
        workspaceId: 2,
        agentName: "SubAgent",
        parentRunId: "parent-uuid",
        model: "gpt-4",
      });

      expect(prisma.agent_runs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            parent_run_id: "parent-uuid",
            model: "gpt-4",
          }),
        }),
      );
    });

    it("sets started_at to a Date", async () => {
      prisma.agent_runs.create.mockResolvedValue({ id: "test-run-uuid-1234" });

      await AgentRuns.create({ workspaceId: 1, agentName: "A" });

      const callData = prisma.agent_runs.create.mock.calls[0][0].data;
      expect(callData.started_at).toBeInstanceOf(Date);
    });
  });

  // ── updateStatus ────────────────────────────────────────────────────
  describe("updateStatus", () => {
    it("updates status to running without setting ended_at", async () => {
      prisma.agent_runs.update.mockResolvedValue({});

      await AgentRuns.updateStatus("run-1", "running");

      expect(prisma.agent_runs.update).toHaveBeenCalledWith({
        where: { id: "run-1" },
        data: { status: "running" },
      });
    });

    it("updates status to done and sets ended_at", async () => {
      prisma.agent_runs.update.mockResolvedValue({});

      await AgentRuns.updateStatus("run-1", "done");

      const callData = prisma.agent_runs.update.mock.calls[0][0].data;
      expect(callData.status).toBe("done");
      expect(callData.ended_at).toBeInstanceOf(Date);
    });

    it("sets ended_at for error status", async () => {
      prisma.agent_runs.update.mockResolvedValue({});

      await AgentRuns.updateStatus("run-1", "error");

      const callData = prisma.agent_runs.update.mock.calls[0][0].data;
      expect(callData.ended_at).toBeInstanceOf(Date);
    });

    it("sets ended_at for cancelled status", async () => {
      prisma.agent_runs.update.mockResolvedValue({});

      await AgentRuns.updateStatus("run-1", "cancelled");

      const callData = prisma.agent_runs.update.mock.calls[0][0].data;
      expect(callData.ended_at).toBeInstanceOf(Date);
    });

    it("does NOT set ended_at for waiting_input status", async () => {
      prisma.agent_runs.update.mockResolvedValue({});

      await AgentRuns.updateStatus("run-1", "waiting_input");

      const callData = prisma.agent_runs.update.mock.calls[0][0].data;
      expect(callData.ended_at).toBeUndefined();
    });
  });

  // ── getActive ───────────────────────────────────────────────────────
  describe("getActive", () => {
    it("returns runs with non-terminal statuses for a workspace", async () => {
      const fakeRuns = [
        { id: "r1", status: "running" },
        { id: "r2", status: "waiting_input" },
      ];
      prisma.agent_runs.findMany.mockResolvedValue(fakeRuns);

      const result = await AgentRuns.getActive(1);

      expect(result).toHaveLength(2);
      expect(prisma.agent_runs.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            workspace_id: 1,
            status: { in: ["running", "waiting_input", "queued"] },
          },
          orderBy: { started_at: "asc" },
          take: 50,
        }),
      );
    });

    it("caps results at 50 to prevent unbounded SSE snapshots", async () => {
      prisma.agent_runs.findMany.mockResolvedValue([]);

      await AgentRuns.getActive(1);

      const call = prisma.agent_runs.findMany.mock.calls[0][0];
      expect(call.take).toBe(50);
    });

    it("returns empty array when no active runs", async () => {
      prisma.agent_runs.findMany.mockResolvedValue([]);

      const result = await AgentRuns.getActive(99);

      expect(result).toEqual([]);
    });
  });

  // ── getRecent ───────────────────────────────────────────────────────
  describe("getRecent", () => {
    it("returns recent runs ordered by started_at desc with default limit 50", async () => {
      const fakeRuns = [{ id: "r1", status: "done" }];
      prisma.agent_runs.findMany.mockResolvedValue(fakeRuns);

      const result = await AgentRuns.getRecent(1);

      expect(result).toEqual(fakeRuns);
      expect(prisma.agent_runs.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { workspace_id: 1 },
          orderBy: { started_at: "desc" },
          take: 50,
        }),
      );
    });

    it("respects a custom limit", async () => {
      prisma.agent_runs.findMany.mockResolvedValue([]);

      await AgentRuns.getRecent(1, 10);

      const call = prisma.agent_runs.findMany.mock.calls[0][0];
      expect(call.take).toBe(10);
    });

    it("returns empty array when workspace has no runs", async () => {
      prisma.agent_runs.findMany.mockResolvedValue([]);

      const result = await AgentRuns.getRecent(99);

      expect(result).toEqual([]);
    });
  });
});
