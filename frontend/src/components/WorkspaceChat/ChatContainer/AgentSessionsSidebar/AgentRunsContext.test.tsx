// SPDX-License-Identifier: MIT
// Purpose: Unit tests for AgentRunsContext — buildTree lineage, SSE event
//          handling, activeRunCount calculation.
import { describe, it, expect } from "vitest";
import React from "react";
import { renderHook, act } from "@testing-library/react";
import { AgentRunsProvider, useAgentRuns } from "./AgentRunsContext";

// Mock EventSource
class MockEventSource {
  listeners: Record<string, ((e: MessageEvent) => void)[]> = {};
  url: string;
  static instances: MockEventSource[] = [];

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  addEventListener(event: string, handler: (e: MessageEvent) => void) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(handler);
  }

  removeEventListener(event: string, handler: (e: MessageEvent) => void) {
    this.listeners[event] = (this.listeners[event] || []).filter(
      (h) => h !== handler,
    );
  }

  emit(event: string, data: any) {
    (this.listeners[event] || []).forEach((h) =>
      h(new MessageEvent(event, { data: JSON.stringify(data) })),
    );
  }

  close() {}
}

// @ts-expect-error - assigning a minimal mock to the global EventSource
global.EventSource = MockEventSource;

describe("AgentRunsContext", () => {
  beforeEach(() => {
    MockEventSource.instances = [];
  });

  it("should provide empty state initially", () => {
    const wrapper = ({ children }: any) => (
      <AgentRunsProvider workspaceSlug="test" authToken="token" apiBase="/api">
        {children}
      </AgentRunsProvider>
    );
    const { result } = renderHook(() => useAgentRuns(), { wrapper });
    expect(result.current.runs).toEqual({});
    expect(result.current.runTree).toEqual([]);
    expect(result.current.activeRunCount).toBe(0);
  });

  it("should build lineage tree from flat run map", () => {
    // Test buildTree logic by simulating SSE events
    const wrapper = ({ children }: any) => (
      <AgentRunsProvider workspaceSlug="test" authToken="token" apiBase="/api">
        {children}
      </AgentRunsProvider>
    );
    const { result } = renderHook(() => useAgentRuns(), { wrapper });

    const es = MockEventSource.instances[0];

    // Start parent run
    act(() => {
      es.emit("run.started", {
        runId: "parent-1",
        parentRunId: null,
        agentName: "Main",
        ts: 1000,
      });
    });
    // Start child run
    act(() => {
      es.emit("run.started", {
        runId: "child-1",
        parentRunId: "parent-1",
        agentName: "Research",
        ts: 2000,
      });
    });
    // Start grandchild
    act(() => {
      es.emit("run.started", {
        runId: "grandchild-1",
        parentRunId: "child-1",
        agentName: "Sub-Research",
        ts: 3000,
      });
    });

    expect(Object.keys(result.current.runs)).toHaveLength(3);
    expect(result.current.runTree).toHaveLength(1); // 1 root
    expect(result.current.runTree[0].runId).toBe("parent-1");
    expect(result.current.runTree[0].children).toHaveLength(1);
    expect(result.current.runTree[0].children![0].runId).toBe("child-1");
    expect(result.current.runTree[0].children![0].children).toHaveLength(1);
    expect(result.current.runTree[0].children![0].children![0].runId).toBe(
      "grandchild-1",
    );
  });

  it("should count active runs correctly", () => {
    const wrapper = ({ children }: any) => (
      <AgentRunsProvider workspaceSlug="test" authToken="token" apiBase="/api">
        {children}
      </AgentRunsProvider>
    );
    const { result } = renderHook(() => useAgentRuns(), { wrapper });
    const es = MockEventSource.instances[0];

    act(() => {
      es.emit("run.started", {
        runId: "r1",
        parentRunId: null,
        agentName: "A",
        ts: 1000,
      });
      es.emit("run.started", {
        runId: "r2",
        parentRunId: null,
        agentName: "B",
        ts: 2000,
      });
    });
    expect(result.current.activeRunCount).toBe(2);

    act(() => {
      es.emit("run.finished", { runId: "r1", status: "done", ts: 3000 });
    });
    expect(result.current.activeRunCount).toBe(1);
  });

  it("should handle tool call events", () => {
    const wrapper = ({ children }: any) => (
      <AgentRunsProvider workspaceSlug="test" authToken="token" apiBase="/api">
        {children}
      </AgentRunsProvider>
    );
    const { result } = renderHook(() => useAgentRuns(), { wrapper });
    const es = MockEventSource.instances[0];

    act(() => {
      es.emit("run.started", {
        runId: "r1",
        parentRunId: null,
        agentName: "A",
        ts: 1000,
      });
      es.emit("run.tool", {
        runId: "r1",
        toolId: "t1",
        name: "rag-memory",
        phase: "args",
        args: { query: "test" },
        ts: 2000,
      });
    });
    expect(result.current.runs["r1"].toolCalls).toHaveLength(1);
    expect(result.current.runs["r1"].toolCalls[0].status).toBe("running");

    act(() => {
      es.emit("run.tool", {
        runId: "r1",
        toolId: "t1",
        phase: "result",
        output: "result data",
        ts: 3000,
      });
    });
    expect(result.current.runs["r1"].toolCalls[0].status).toBe("done");
    expect(result.current.runs["r1"].toolCalls[0].output).toBe("result data");
  });

  it("should handle multiple parallel runs as separate roots", () => {
    const wrapper = ({ children }: any) => (
      <AgentRunsProvider workspaceSlug="test" authToken="token" apiBase="/api">
        {children}
      </AgentRunsProvider>
    );
    const { result } = renderHook(() => useAgentRuns(), { wrapper });
    const es = MockEventSource.instances[0];

    act(() => {
      es.emit("run.started", {
        runId: "r1",
        parentRunId: null,
        agentName: "A",
        ts: 1000,
      });
      es.emit("run.started", {
        runId: "r2",
        parentRunId: null,
        agentName: "B",
        ts: 2000,
      });
      es.emit("run.started", {
        runId: "r3",
        parentRunId: null,
        agentName: "C",
        ts: 3000,
      });
    });

    expect(result.current.runTree).toHaveLength(3);
    // Sorted by startedAt descending
    expect(result.current.runTree[0].runId).toBe("r3");
    expect(result.current.runTree[1].runId).toBe("r2");
    expect(result.current.runTree[2].runId).toBe("r1");
  });
});
