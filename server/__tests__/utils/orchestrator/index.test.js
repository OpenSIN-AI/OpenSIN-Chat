// SPDX-License-Identifier: MIT
const { AgentOrchestrator, getOrchestrator } = require("../../../utils/orchestrator");

describe("AgentOrchestrator", () => {
  describe("getOrchestrator (singleton)", () => {
    it("returns the same instance on repeated calls", () => {
      expect(getOrchestrator()).toBe(getOrchestrator());
    });
  });

  describe("static inferSteps", () => {
    it("infers politician + report steps for a politician/report goal", () => {
      const types = AgentOrchestrator.inferSteps(
        "Erstelle einen PDF-Bericht über AfD-Abgeordnete im Bundestag",
      ).map((s) => s.type);
      expect(types).toContain("search_politician");
      expect(types).toContain("generate_report");
    });

    it("infers deep_research + extract + report for a deep research goal", () => {
      const types = AgentOrchestrator.inferSteps(
        "Tiefenrecherche zur Position und Quellen analysieren, dann Gutachten erstellen",
      ).map((s) => s.type);
      expect(types).toContain("deep_research");
      expect(types).toContain("extract_urls");
      expect(types).toContain("generate_report");
    });

    it("falls back to research + report when nothing matches", () => {
      const types = AgentOrchestrator.inferSteps("xyz qrs tuv").map((s) => s.type);
      expect(types).toEqual(["deep_research", "generate_report"]);
    });

    it("every inferred step has a type and a label", () => {
      const steps = AgentOrchestrator.inferSteps("Recherche und Bericht");
      for (const s of steps) {
        expect(typeof s.type).toBe("string");
        expect(typeof s.label).toBe("string");
      }
    });
  });

  describe("startWorkflow (autoRun disabled for determinism)", () => {
    it("throws when goal is missing", async () => {
      const o = new AgentOrchestrator();
      await expect(o.startWorkflow({ autoRun: false })).rejects.toThrow("Goal is required");
    });

    it("honors explicit steps when provided", async () => {
      const o = new AgentOrchestrator();
      const { steps } = await o.startWorkflow({
        goal: "egal",
        steps: [{ type: "search_politician", label: "Custom" }],
        autoRun: false,
      });
      expect(steps).toHaveLength(1);
      expect(steps[0].type).toBe("search_politician");
    });

    it("registers a workflow and exposes a matching status", async () => {
      const o = new AgentOrchestrator();
      const { workflowId, steps } = await o.startWorkflow({
        goal: "Recherche zur Energiepolitik",
        autoRun: false,
      });
      expect(typeof workflowId).toBe("string");
      expect(steps.length).toBeGreaterThan(0);

      const status = o.getStatus(workflowId);
      expect(status).not.toBeNull();
      expect(status.workflowId).toBe(workflowId);
      expect(status.totalSteps).toBe(steps.length);
      expect(status.status).toBe("pending");
    });

    it("exposes results for a registered workflow", async () => {
      const o = new AgentOrchestrator();
      const { workflowId } = await o.startWorkflow({
        goal: "Recherche zur Energiepolitik",
        autoRun: false,
      });
      const results = o.getResults(workflowId);
      expect(results).not.toBeNull();
      expect(results.workflowId).toBe(workflowId);
      expect(Array.isArray(results.steps)).toBe(true);
    });
  });

  describe("status/results for unknown workflows", () => {
    it("getStatus returns null for an unknown id", () => {
      expect(new AgentOrchestrator().getStatus("nope")).toBeNull();
    });

    it("getResults returns null for an unknown id", () => {
      expect(new AgentOrchestrator().getResults("nope")).toBeNull();
    });

    it("listWorkflows returns an array", () => {
      const o = new AgentOrchestrator();
      o.startWorkflow({ goal: "test", autoRun: false });
      const list = o.listWorkflows();
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThan(0);
    });
  });
});
