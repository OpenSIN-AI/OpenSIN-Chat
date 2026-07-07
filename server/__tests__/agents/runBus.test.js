// SPDX-License-Identifier: MIT
// Purpose: Unit tests for runBus — event publishing, listener management.
const { agentRunBus } = require("../../../server/utils/agents/runBus");

describe("AgentRunBus", () => {
  afterEach(() => {
    agentRunBus.removeAllListeners();
  });

  it("should be an EventEmitter", () => {
    expect(agentRunBus).toBeDefined();
    expect(typeof agentRunBus.on).toBe("function");
    expect(typeof agentRunBus.emit).toBe("function");
  });

  it("should publish events to subscribers", (done) => {
    agentRunBus.on("agentrun", (evt) => {
      expect(evt.workspaceSlug).toBe("test-ws");
      expect(evt.event).toBe("run.started");
      expect(evt.data.runId).toBe("run-123");
      done();
    });

    agentRunBus.publish("test-ws", "run.started", {
      runId: "run-123",
      agentName: "TestAgent",
      ts: Date.now(),
    });
  });

  it("should support multiple listeners", () => {
    let count = 0;
    agentRunBus.on("agentrun", () => count++);
    agentRunBus.on("agentrun", () => count++);

    agentRunBus.publish("ws", "run.finished", { runId: "r1", status: "done", ts: 0 });
    expect(count).toBe(2);
  });

  it("should handle cancel events", (done) => {
    agentRunBus.on("cancel", (data) => {
      expect(data.runId).toBe("run-to-cancel");
      done();
    });

    agentRunBus.emit("cancel", { runId: "run-to-cancel" });
  });

  it("should handle respond events", (done) => {
    agentRunBus.on("respond", (data) => {
      expect(data.runId).toBe("run-respond");
      expect(data.payload.answer).toBe("yes");
      done();
    });

    agentRunBus.emit("respond", { runId: "run-respond", payload: { answer: "yes" } });
  });
});
