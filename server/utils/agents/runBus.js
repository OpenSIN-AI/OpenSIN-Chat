// SPDX-License-Identifier: MIT
// Purpose: Central event bus for agent run lifecycle events.
//          Single-VM in-memory EventEmitter. If horizontal scaling is added
//          later, swap this for Redis Pub/Sub.
// Docs: runBus.doc.md

const { EventEmitter } = require("events");

/**
 * @class AgentRunBus
 * @description Process-wide bus that carries agent run events
 * (run.started, run.tool, run.log, run.waiting_input, run.finished, cancel, respond).
 *
 * Producers: AIbitat hooks, MCP tool bridge, AgentHandler.
 * Consumers: agentRunsStream SSE endpoint (multiplexes to frontend).
 *
 * Event shape: { workspaceSlug, event: string, data: object }
 */
class AgentRunBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(200);
  }

  /**
   * Emit a run event to all subscribers.
   * @param {string} workspaceSlug
   * @param {string} event - run.started | run.tool | run.log | run.waiting_input | run.finished
   * @param {object} data
   */
  publish(workspaceSlug, event, data) {
    this.emit("agentrun", { workspaceSlug, event, data });
  }
}

const agentRunBus = new AgentRunBus();

module.exports = { agentRunBus };
