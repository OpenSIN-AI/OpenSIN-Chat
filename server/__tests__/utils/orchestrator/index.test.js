// SPDX-License-Identifier: MIT
const { AgentOrchestrator, getOrchestrator } = require("../../../utils/orchestrator");

describe("AgentOrchestrator", () => {
  let orchestrator;

  beforeEach(() => {
    AgentOrchestrator._instance = null;
    orchestrator = new AgentOrchestrator();
  });

  describe("constructor", () => {
    test("creates instance with empty activeWorkflows", () => {
      expect(orchestrator.activeWorkflows).toBeInstanceOf(Map);
      expect(orchestrator.activeWorkflows.size).toBe(0);
    });
  });

  describe("startWorkflow", () => {
    test("throws when goal is missing", async () => {
      await expect(orchestrator.startWorkflow({})).rejects.toThrow("Goal is required");
    });

    test("creates workflow with auto-generated UUID", async () => {
      const result = await orchestrator.startWorkflow({ goal: "Test goal", autoRun: false });
      expect(result.workflowId).toBeDefined();
      expect(typeof result.workflowId).toBe("string");
      expect(result.workflowId.length).toBeGreaterThan(0);
    });

    test("returns workflow steps", async () => {
      const result = await orchestrator.startWorkflow({ goal: "Test goal", autoRun: false });
      expect(result.steps).toBeInstanceOf(Array);
      expect(result.steps.length).toBeGreaterThan(0);
      result.steps.forEach((step) => {
        expect(step).toHaveProperty("id");
        expect(step).toHaveProperty("type");
        expect(step).toHaveProperty("label");
      });
    });

    test("uses explicit steps when provided", async () => {
      const explicitSteps = [
        { type: "custom_step", label: "Custom Step" },
      ];
      const result = await orchestrator.startWorkflow({ goal: "Test", steps: explicitSteps, autoRun: false });
      expect(result.steps).toEqual([
        { id: "step-0", type: "custom_step", label: "Custom Step" },
      ]);
    });

    test("stores workflow in activeWorkflows", async () => {
      const result = await orchestrator.startWorkflow({ goal: "Test goal", autoRun: false });
      const workflow = orchestrator.activeWorkflows.get(result.workflowId);
      expect(workflow).toBeDefined();
      expect(workflow.goal).toBe("Test goal");
      expect(workflow.status).toBe("pending");
    });

    test("sets autoRun to false when specified", async () => {
      const result = await orchestrator.startWorkflow({ goal: "Test", autoRun: false });
      const workflow = orchestrator.activeWorkflows.get(result.workflowId);
      expect(workflow.status).toBe("pending");
    });
  });

  describe("getStatus", () => {
    test("returns null for unknown workflowId", () => {
      expect(orchestrator.getStatus("unknown-id")).toBeNull();
    });

    test("returns workflow status", async () => {
      const result = await orchestrator.startWorkflow({ goal: "Test goal", autoRun: false });
      const status = orchestrator.getStatus(result.workflowId);
      expect(status).toHaveProperty("workflowId", result.workflowId);
      expect(status).toHaveProperty("goal", "Test goal");
      expect(status).toHaveProperty("status", "pending");
      expect(status).toHaveProperty("currentStep", 0);
      expect(status).toHaveProperty("totalSteps");
      expect(status).toHaveProperty("steps");
      expect(status).toHaveProperty("error", null);
    });
  });

  describe("getResults", () => {
    test("returns null for unknown workflowId", () => {
      expect(orchestrator.getResults("unknown-id")).toBeNull();
    });

    test("returns workflow results", async () => {
      const result = await orchestrator.startWorkflow({ goal: "Test goal", autoRun: false });
      const results = orchestrator.getResults(result.workflowId);
      expect(results).toHaveProperty("workflowId", result.workflowId);
      expect(results).toHaveProperty("goal", "Test goal");
      expect(results).toHaveProperty("status", "pending");
      expect(results).toHaveProperty("steps");
    });
  });

  describe("listWorkflows", () => {
    test("returns empty array when no workflows", () => {
      expect(orchestrator.listWorkflows()).toEqual([]);
    });

    test("returns all workflows", async () => {
      await orchestrator.startWorkflow({ goal: "Goal 1", autoRun: false });
      await orchestrator.startWorkflow({ goal: "Goal 2", autoRun: false });
      const workflows = orchestrator.listWorkflows();
      expect(workflows).toHaveLength(2);
      workflows.forEach((w) => {
        expect(w).toHaveProperty("workflowId");
        expect(w).toHaveProperty("goal");
        expect(w).toHaveProperty("status");
        expect(w).toHaveProperty("currentStep");
        expect(w).toHaveProperty("totalSteps");
        expect(w).toHaveProperty("createdAt");
      });
    });
  });

  describe("inferSteps", () => {
    test("infers politician search for political keywords", () => {
      const steps = AgentOrchestrator.inferSteps("Wie ist die Position der AfD zum Klimaschutz?");
      expect(steps.some((s) => s.type === "search_politician")).toBe(true);
    });

    test("infers politician search for bundestag keyword", () => {
      const steps = AgentOrchestrator.inferSteps("Recherchiere die Bundestagswahl 2025");
      // "bundestag" matches politician regex, so search_politician is inferred
      expect(steps.some((s) => s.type === "search_politician")).toBe(true);
    });

    test("infers report generation for report keywords", () => {
      const steps = AgentOrchestrator.inferSteps("Erstelle einen PDF-Bericht über die AfD");
      expect(steps.some((s) => s.type === "generate_report")).toBe(true);
    });

    test("infers URL extraction for deep detail keywords", () => {
      const steps = AgentOrchestrator.inferSteps("Extrahiere Details aus Quellen und führe Recherche durch");
      expect(steps.some((s) => s.type === "extract_urls")).toBe(true);
    });

    test("defaults to research + report when no keywords match", () => {
      const steps = AgentOrchestrator.inferSteps("Etwas völlig Anderes");
      expect(steps.some((s) => s.type === "deep_research")).toBe(true);
      expect(steps.some((s) => s.type === "generate_report")).toBe(true);
    });

    test("combines multiple step types", () => {
      const steps = AgentOrchestrator.inferSteps("Politiker recherchieren und Bericht erstellen");
      const types = steps.map((s) => s.type);
      expect(types).toContain("search_politician");
      expect(types).toContain("deep_research");
      expect(types).toContain("generate_report");
    });
  });

  describe("getOrchestrator (singleton)", () => {
    test("returns same instance on multiple calls", () => {
      const instance1 = getOrchestrator();
      const instance2 = getOrchestrator();
      expect(instance1).toBe(instance2);
    });

    test("instance is AgentOrchestrator", () => {
      const instance = getOrchestrator();
      expect(instance).toBeInstanceOf(AgentOrchestrator);
    });
  });
});
