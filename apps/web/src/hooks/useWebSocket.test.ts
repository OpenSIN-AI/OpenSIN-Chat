// SPDX-License-Identifier: MIT
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { socketState, logger, uuidState } = vi.hoisted(() => ({
  socketState: {
    instances: [] as any[],
    throwOnConstruct: false,
  },
  logger: { error: vi.fn() },
  uuidState: { value: 0 },
}));

vi.mock("uuid", () => ({
  v4: () => `uuid-${++uuidState.value}`,
}));

vi.mock("@/utils/chat", () => ({
  ABORT_STREAM_EVENT: "abort-stream-test",
}));

vi.mock("@/utils/chat/agent", () => ({
  websocketURI: () => "wss://example.test",
  AGENT_SESSION_END: "agent-session-end-test",
  AGENT_SESSION_START: "agent-session-start-test",
}));

vi.mock("@/components/WorkspaceChat/ChatContainer/DnDWrapper", () => ({
  CLEAR_ATTACHMENTS_EVENT: "clear-attachments-test",
}));

vi.mock("@/utils/constants", () => ({ AUTH_TOKEN: "auth-token" }));
vi.mock("@/utils/safeStorage", () => ({ safeGetItem: vi.fn(() => null) }));
vi.mock("@/utils/logger", () => ({ default: logger }));

vi.mock("@/utils/chat/SSESocket", () => {
  class FakeSSESocket {
    listeners = new Map<string, Set<(event: any) => void>>();
    readyState = 1;
    supportsAgentStreaming = true;
    close = vi.fn();
    send = vi.fn();

    constructor(public socketId: string) {
      if (socketState.throwOnConstruct) {
        socketState.throwOnConstruct = false;
        throw new Error("SSE unavailable");
      }
      socketState.instances.push(this);
    }

    addEventListener(type: string, listener: (event: any) => void) {
      const listeners = this.listeners.get(type) ?? new Set();
      listeners.add(listener);
      this.listeners.set(type, listeners);
    }

    emit(type: string, event: any = {}) {
      for (const listener of this.listeners.get(type) ?? []) listener(event);
    }
  }

  return { default: FakeSSESocket };
});

import useWebSocket from "./useWebSocket";

const ABORT_STREAM_EVENT = "abort-stream-test";
const AGENT_SESSION_END = "agent-session-end-test";
const AGENT_SESSION_START = "agent-session-start-test";
const CLEAR_ATTACHMENTS_EVENT = "clear-attachments-test";

type HookOverrides = Partial<ReturnType<typeof makeProps>>;

function makeProps() {
  return {
    socketId: "socket-1" as string | null,
    websocket: null as WebSocket | null,
    setWebsocket: vi.fn(),
    setSocketId: vi.fn(),
    setAgentSessionActive: vi.fn(),
    setLoadingResponse: vi.fn(),
    handleSocketResponse: vi.fn(),
    setChatHistory: vi.fn(),
    pendingResetRef: { current: false },
    workspaceSlug: null as string | null,
    threadSlug: null as string | null,
  };
}

function renderUseWebSocket(overrides: HookOverrides = {}) {
  const props = { ...makeProps(), ...overrides };
  const hook = renderHook((current) => useWebSocket(current), {
    initialProps: props,
  });
  return { ...hook, props };
}

function lastSocket() {
  return socketState.instances.at(-1);
}

function runHistoryUpdate(mock: ReturnType<typeof vi.fn>, previous: any[]) {
  const updater = mock.mock.calls.at(-1)?.[0];
  expect(updater).toBeTypeOf("function");
  return updater(previous);
}

beforeEach(() => {
  socketState.instances.length = 0;
  socketState.throwOnConstruct = false;
  logger.error.mockClear();
  uuidState.value = 0;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useWebSocket", () => {
  it("skips setup without a socket id or when a socket already exists", () => {
    const missing = renderUseWebSocket({ socketId: null });
    expect(socketState.instances).toHaveLength(0);
    expect(missing.props.setAgentSessionActive).not.toHaveBeenCalled();
    missing.unmount();

    const existingSocket = {} as WebSocket;
    const existing = renderUseWebSocket({ websocket: existingSocket });
    expect(socketState.instances).toHaveLength(0);
    expect(existing.props.setWebsocket).not.toHaveBeenCalled();
    existing.unmount();
  });

  it("starts an SSE agent session and forwards socket events", () => {
    const starts = vi.fn();
    const clears = vi.fn();
    const ends = vi.fn();
    window.addEventListener(AGENT_SESSION_START, starts);
    window.addEventListener(CLEAR_ATTACHMENTS_EVENT, clears);
    window.addEventListener(AGENT_SESSION_END, ends);

    const { props, unmount } = renderUseWebSocket();
    const socket = lastSocket();
    expect(socket.socketId).toBe("socket-1");
    expect(socket.supportsAgentStreaming).toBe(false);
    expect(props.setAgentSessionActive).toHaveBeenCalledWith(true);
    expect(props.setWebsocket).toHaveBeenCalledWith(socket);
    expect(starts).toHaveBeenCalledTimes(1);
    expect(clears).toHaveBeenCalledTimes(1);

    const message = new MessageEvent("message", { data: "payload" });
    act(() => socket.emit("message", message));
    expect(props.handleSocketResponse).toHaveBeenCalledWith(
      socket,
      message,
      props.setChatHistory,
    );

    act(() => socket.emit("error"));
    expect(logger.error).toHaveBeenCalledWith(
      "[useWebSocket] Socket error event received.",
    );
    act(() => socket.emit("open"));

    unmount();
    expect(socket.close).toHaveBeenCalled();
    expect(props.setAgentSessionActive).toHaveBeenLastCalledWith(false);
    expect(ends).toHaveBeenCalled();
    window.removeEventListener(AGENT_SESSION_START, starts);
    window.removeEventListener(CLEAR_ATTACHMENTS_EVENT, clears);
    window.removeEventListener(AGENT_SESSION_END, ends);
  });

  it("ends and closes the session when message handling throws", () => {
    const props = makeProps();
    props.handleSocketResponse.mockImplementation(() => {
      throw new Error("bad payload");
    });
    const { unmount } = renderUseWebSocket(props);
    const socket = lastSocket();

    act(() => socket.emit("message", new MessageEvent("message")));
    expect(logger.error).toHaveBeenCalledWith("Failed to parse data");
    expect(props.setAgentSessionActive).toHaveBeenCalledWith(false);
    expect(socket.close).toHaveBeenCalled();
    unmount();
  });

  it.each([1000, 1008])(
    "treats close code %s as final and appends completion status",
    (code) => {
      const { props, unmount } = renderUseWebSocket();
      const socket = lastSocket();

      act(() => socket.emit("close", { code }));
      expect(props.setAgentSessionActive).toHaveBeenLastCalledWith(false);
      expect(props.setLoadingResponse).toHaveBeenCalledWith(false);
      expect(props.setWebsocket).toHaveBeenLastCalledWith(null);
      expect(props.setSocketId).toHaveBeenCalledWith(null);

      const result = runHistoryUpdate(props.setChatHistory, [
        { content: "" },
        { content: "keep" },
      ]);
      expect(result).toEqual([
        { content: "keep" },
        expect.objectContaining({
          type: "statusResponse",
          content: "Agent session complete.",
          error: null,
          uuid: "uuid-1",
        }),
      ]);
      unmount();
    },
  );

  it("consumes a pending reset without adding completion history", () => {
    const pendingResetRef = { current: true };
    const { props, unmount } = renderUseWebSocket({ pendingResetRef });
    act(() => lastSocket().emit("close", { code: 1000 }));
    expect(pendingResetRef.current).toBe(false);
    expect(props.setChatHistory).not.toHaveBeenCalled();
    unmount();
  });

  it("reconnects with backoff and reports exhaustion after three retries", () => {
    vi.useFakeTimers();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { props, unmount } = renderUseWebSocket();

    for (let attempt = 1; attempt <= 3; attempt++) {
      const socket = lastSocket();
      act(() => socket.emit("close", { code: 1006 }));
      expect(warn).toHaveBeenLastCalledWith(
        expect.stringContaining(`attempting reconnect ${attempt}/3`),
      );
      const update = runHistoryUpdate(props.setChatHistory, [
        { content: "" },
        { content: "kept" },
      ]);
      expect(update.at(-1)).toMatchObject({
        content: `Connection lost. Reconnecting (${attempt}/3)…`,
        error: null,
      });
      act(() => vi.runOnlyPendingTimers());
      expect(socketState.instances).toHaveLength(attempt + 1);
    }

    act(() => lastSocket().emit("close", { code: 1006 }));
    const final = runHistoryUpdate(props.setChatHistory, [{ content: "kept" }]);
    expect(final.at(-1)).toMatchObject({
      content: "Agent session lost — connection could not be restored.",
      error: "Connection lost after multiple retry attempts.",
    });
    expect(props.setLoadingResponse).toHaveBeenCalledWith(false);
    expect(props.setSocketId).toHaveBeenCalledWith(null);
    warn.mockRestore();
    unmount();
  });

  it("filters abort events by socket, workspace and thread before closing", () => {
    const { props, unmount } = renderUseWebSocket({
      workspaceSlug: "workspace-a",
      threadSlug: "thread-a",
    });
    const socket = lastSocket();

    act(() =>
      window.dispatchEvent(
        new CustomEvent(ABORT_STREAM_EVENT, {
          detail: { socketId: "other" },
        }),
      ),
    );
    act(() =>
      window.dispatchEvent(
        new CustomEvent(ABORT_STREAM_EVENT, {
          detail: { socketId: "socket-1", workspaceSlug: "workspace-b" },
        }),
      ),
    );
    act(() =>
      window.dispatchEvent(
        new CustomEvent(ABORT_STREAM_EVENT, {
          detail: {
            socketId: "socket-1",
            workspaceSlug: "workspace-a",
            threadSlug: "thread-b",
          },
        }),
      ),
    );
    act(() =>
      window.dispatchEvent(new CustomEvent(ABORT_STREAM_EVENT, { detail: {} })),
    );
    expect(socket.close).not.toHaveBeenCalled();

    act(() =>
      window.dispatchEvent(
        new CustomEvent(ABORT_STREAM_EVENT, {
          detail: {
            socketId: "socket-1",
            workspaceSlug: "workspace-a",
            threadSlug: "thread-a",
          },
        }),
      ),
    );
    expect(socket.close).toHaveBeenCalledTimes(1);
    expect(props.setAgentSessionActive).toHaveBeenLastCalledWith(false);
    unmount();
  });

  it("accepts an unscoped abort event", () => {
    const { props, unmount } = renderUseWebSocket();
    const socket = lastSocket();
    act(() => window.dispatchEvent(new CustomEvent(ABORT_STREAM_EVENT)));
    expect(socket.close).toHaveBeenCalled();
    expect(props.setAgentSessionActive).toHaveBeenLastCalledWith(false);
    unmount();
  });

  it("turns constructor failures into an abort history item and resets state", () => {
    socketState.throwOnConstruct = true;
    const { props, unmount } = renderUseWebSocket();
    expect(socketState.instances).toHaveLength(0);
    const result = runHistoryUpdate(props.setChatHistory, [
      { content: "" },
      { content: "kept" },
    ]);
    expect(result).toEqual([
      { content: "kept" },
      expect.objectContaining({
        type: "abort",
        content: "SSE unavailable",
        error: "SSE unavailable",
      }),
    ]);
    expect(props.setLoadingResponse).toHaveBeenCalledWith(false);
    expect(props.setWebsocket).toHaveBeenCalledWith(null);
    expect(props.setSocketId).toHaveBeenCalledWith(null);
    unmount();
  });
});
