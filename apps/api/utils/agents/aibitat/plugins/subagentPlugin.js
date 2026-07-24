// SPDX-License-Identifier: MIT
// Purpose: AIbitat plugin that enables agents to spawn subagents.
//          Registers a "spawn_subagent" function that the LLM can call
//          to delegate work to a child agent.
//          The child runs in isolation and its result is returned.
// Docs: subagentPlugin.doc.md

const { subagentSpawner } = require("../../subagentSpawner");

/**
 * AIbitat plugin that gives agents the ability to spawn subagents.
 * When registered, the agent can call `spawn_subagent` as a tool.
 *
 * @param {Object} aibitat - The AIbitat instance
 * @returns {Object} Plugin setup
 */
function subagentPlugin(_aibitat) {
  return {
    name: "subagent-spawner",
    setup(aibitat) {
      aibitat.function({
        super: aibitat,
        name: "spawn_subagent",
        description:
          "Spawn a subagent to handle a sub-task in isolation. " +
          "The subagent runs with its own context and returns its result. " +
          "Use this to delegate work, run parallel research, or get a second opinion. " +
          "The subagent's progress is visible in the Agent Sessions panel.",
        parameters: {
          $schema: "http://json-schema.org/draft-07/schema#",
          type: "object",
          properties: {
            agentName: {
              type: "string",
              description:
                "Name/identifier of the agent to spawn (e.g. 'research-agent', 'code-reviewer')",
            },
            prompt: {
              type: "string",
              description: "The task/prompt to send to the subagent",
            },
            model: {
              type: "string",
              description: "Optional: override the model for this subagent",
            },
          },
          required: ["agentName", "prompt"],
        },
        handler: async function (args = {}) {
          const { agentName, prompt, model } = args;

          // Get run context from the aibitat instance (set by AgentHandler)
          const runId = aibitat._runId;
          const workspaceSlug = aibitat._workspaceSlug;
          const workspaceId = aibitat._workspaceId;

          if (!runId || !workspaceSlug || !workspaceId) {
            // Fallback: run without subagent linkage if context is missing
            aibitat.introspect(
              `[spawn_subagent] Warning: no run context available, spawning without parent linkage`,
            );
          }

          aibitat.introspect(
            `[spawn_subagent] Spawning "${agentName}" with prompt: ${prompt.slice(0, 100)}...`,
          );

          try {
            const { runId: childRunId, result } = await subagentSpawner.spawn({
              parentRunId: runId || null,
              workspaceId,
              workspaceSlug,
              agentName,
              prompt,
              model: model || undefined,
            });

            aibitat.introspect(
              `[spawn_subagent] Subagent "${agentName}" completed (run ${childRunId})`,
            );

            // Return the subagent's result to the parent LLM
            const resultStr =
              typeof result?.response === "string"
                ? result.response
                : JSON.stringify(result);

            return `<subagent_result agent="${agentName}" runId="${childRunId}">\n${resultStr}\n</subagent_result>`;
          } catch (e) {
            aibitat.introspect(
              `[spawn_subagent] Subagent "${agentName}" failed: ${e.message}`,
            );
            return `<subagent_error agent="${agentName}">\n${e.message}\n</subagent_error>`;
          }
        },
      });
    },
  };
}

module.exports = { subagentPlugin };
