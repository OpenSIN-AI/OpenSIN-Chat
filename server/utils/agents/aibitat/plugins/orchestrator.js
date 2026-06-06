// SPDX-License-Identifier: MIT
/**
 * Orchestrator agent plugin for aibitat.
 *
 * Docs: orchestrator.doc.md
 * Purpose: Exposes start_workflow, get_workflow_status, get_workflow_result
 * as aibitat functions for the AI agent.
 */

const orchestratorAgent = {
  name: "orchestrator",
  startupConfig: { params: {} },
  plugin: function () {
    return {
      name: this.name,
      setup(aibitat) {
        aibitat.function({
          super: aibitat,
          name: "start_workflow",
          description:
            "Start a goal-driven multi-step workflow. The orchestrator automatically determines " +
            "which modules to use (PoliticianDB, Deep Research, PDF Reports, URL extraction) " +
            "based on the goal. Returns a workflow ID for polling.",
          examples: [
            {
              prompt: "Research AfD's position on energy policy and create a PDF report",
              call: JSON.stringify({ goal: "Recherchiere die AfD-Position zur Energiepolitik und erstelle einen PDF-Bericht" }),
            },
          ],
          parameters: {
            $schema: "http://json-schema.org/draft-07/schema#",
            type: "object",
            properties: {
              goal: {
                type: "string",
                description: "The goal in natural language (German or English).",
              },
              steps: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string", description: "Step type: search_politician, deep_research, extract_urls, generate_report" },
                    label: { type: "string", description: "Human-readable step label" },
                  },
                },
                description: "Optional explicit steps (auto-inferred from goal if omitted).",
              },
              options: {
                type: "object",
                description: "Optional per-step options (researchDepth, reportTemplate, etc.).",
              },
            },
            required: ["goal"],
            additionalProperties: false,
          },
          handler: async function ({ goal, steps, options } = {}) {
            try {
              const { getOrchestrator } = require("../../../orchestrator");
              const orchestrator = getOrchestrator();
              const result = await orchestrator.startWorkflow({ goal, steps, options });
              return `Workflow started. ID: ${result.workflowId}. Steps: ${result.steps.map((s) => s.label).join(" → ")}. Use get_workflow_status to track progress.`;
            } catch (error) {
              return `Error starting workflow: ${error.message}`;
            }
          },
        });

        aibitat.function({
          super: aibitat,
          name: "get_workflow_status",
          description: "Check the status of a running workflow. Returns step progress and errors.",
          parameters: {
            $schema: "http://json-schema.org/draft-07/schema#",
            type: "object",
            properties: {
              workflowId: { type: "string", description: "Workflow ID from start_workflow." },
            },
            required: ["workflowId"],
            additionalProperties: false,
          },
          handler: async function ({ workflowId } = {}) {
            try {
              const { getOrchestrator } = require("../../../orchestrator");
              const orchestrator = getOrchestrator();
              const status = orchestrator.getStatus(workflowId);
              if (!status) return "Workflow not found.";
              return JSON.stringify(status);
            } catch (error) {
              return `Error: ${error.message}`;
            }
          },
        });

        aibitat.function({
          super: aibitat,
          name: "get_workflow_result",
          description: "Get the final results of a completed workflow.",
          parameters: {
            $schema: "http://json-schema.org/draft-07/schema#",
            type: "object",
            properties: {
              workflowId: { type: "string", description: "Workflow ID from start_workflow." },
            },
            required: ["workflowId"],
            additionalProperties: false,
          },
          handler: async function ({ workflowId } = {}) {
            try {
              const { getOrchestrator } = require("../../../orchestrator");
              const orchestrator = getOrchestrator();
              const results = orchestrator.getResults(workflowId);
              if (!results) return "Workflow not found.";
              if (results.status !== "completed") return `Workflow still running (${results.status}). Try again later.`;
              return JSON.stringify(results);
            } catch (error) {
              return `Error: ${error.message}`;
            }
          },
        });
      },
    };
  },
};

module.exports = { orchestratorAgent };
