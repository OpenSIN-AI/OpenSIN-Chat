// SPDX-License-Identifier: MIT
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const instances: any[] = [];
  const logger = { error: vi.fn() };
  const safeGetItem = vi.fn(() => null);
  const uuid = vi.fn(() => "status-uuid");
  let throwOnConstruct = false;

  class MockSSESocket {
    listeners = new Map<string, Set<(event: any) => void>>();
    supportsAgentStreaming = true;
    readyState = 1;
    closed = false;
    socketId: string;

    constructor(socketId: string) {
      if (throwOnConstruct) throw new Error("constructor boom");
      this.socketId = socketId;
      instances.push(this);
    }

    addEventListener(type: string, listener: (event: any) => void) {
      if (!this.listeners.has(type)) this.listeners.set(type, new Set());
      this.listeners.get(type)!.add(listener);
    }

    emit(type: string, event: any = new Event(type)) {
      for (const listener of this.listeners.get(type) || []) listener(event);
    }

    close() {
      this.closed = true;
      this.emit("close", { code: 1000 });
    }
  }

  return {
    instances,
    logger,
    safeGetItem,
    uuid,
    MockSSESocket,
    setThrowOnConstruct(value: boolean) {
      throwOnConstruct = value;
    },
  };
});

vi.mock("uuid", () => ({ v4: mocks.uuid }));
vi.mock("@/utils/chat", () => ({ ABORT_STREAM_EVENT: "abort-chat-stream" }));
vi.mock("@/utils/chat/agent", () => ({
  websocketURI: () => "https://example.test",
  AGENT_SESSION_END: "agent-session-end",
  AGENT_SESSION_START: "agent-session-start",
}));
vi.mock("@/utils/chat/SSESocket", () => ({ default: mocks.MockSSESocket }));
vi.mock("@/components/WorkspaceChat/ChatContainer/DnDWrapper", () => ({
  CLEAR_ATTACHMENTS_EVENT: "attachment-clear",
}));
vi.mock("@/utils/constants", () => ({ AUTH_TOKEN: "auth-token" }));
vi.mock("@/utils/safeStorage", () => ({ safeGetItem: mocks.safeGetItem }));
vi.mock("@/utils/logger", () => ({ default: mocks.logger }));

import useWebSocket from "./useWebSocket";

function createProps(overrides: Record<string, unknown> = {}) {
  return {
    socketId: "socket-1",
    websocket: null,
    setWebsocket: vi.fn(),
    setSocketId: vi.fn(),
    setAgentSessionActive: vi.fn(),
    setLoadingResponse: vi.fn(),
    handleSocketResponse: vi.fn(),
    setChatHistory: vi.fn(),
    pendingResetRef: { current: false },
    workspaceSlug: "workspace-a",
    threadSlug: "thread-a",
    ...overrides,
  } as any;
}

describe("useWebSocket", () => {
  beforeEach(() => {
    mocks.instances.length = 0;
    mocks.setThrowOnConstruct(false);
    mocks.safeGetItem.mockReturnValue(null);
  });

  it("does nothing without a socket id or when a socket already exists", () => {
    const none = createProps({ socketId: null });
    const first = renderHook(() => useWebSocket(none));
    expect(mocks.instances).toHaveLength(0);
    expect(none.setWebsocket).not.toHaveBeenCalled();
    first.unmount();

    const existing = createProps({ websocket: {} });
    const second = renderHook(() => useWebSocket(existing));
    expect(mocks.instances).toHaveLength(0);
    second.unmount();
  });

  it("opens the SSE fallback, forwards messages, logs errors, and finishes cleanly", () => {
    const props = createProps();
    const starts = vi.fn();
    const ends = vi.fn();
    const clears = vi.fn();
    window.addEventListener("agent-session-start", starts);
    window.addEventListener("agent-session-end", ends);
    window.addEventListener("attachment-clear", clears);

    const hook = renderHook(() => useWebSocket(props));
    const socket = mocks.instances[0];
    expect(socket.socketId).toBe("socket-1");
    expect(socket.supportsAgentStreaming).toBe(false);
    expect(props.setAgentSessionActive).toHaveBeenCalledWith(true);
    expect(props.setWebsocket).toHaveBeenCalledWith(socket);
    expect(starts).toHaveBeenCalledTimes(1);
    expect(clears).toHaveBeenCalledTimes(1);

    const message = { data: '{"type":"text"}' } as MessageEvent;
    act(() => socket.emit("message", message));
    expect(props.handleSocketResponse).toHaveBeenCalledWith(
      socket,
      message,
      props.setChatHistory,
    );

    act(() => socket.emit("error"));
    expect(mocks.logger.error).toHaveBeenCalledWith(
      "[useWebSocket] Socket error event received.",
    );

    act(() => socket.emit("open"));
    act(() => socket.emit("close", { code: 1000 }));
    expect(props.setAgentSessionActive).toHaveBeenLastCalledWith(false);
    expect(ends).toHaveBeenCalled();
    expect(props.setChatHistory).toHaveBeenCalled();
    const updater = props.setChatHistory.mock.calls.at(-1)[0];
    expect(updater([{ content: "" }, { content: "kept" }])).toEqual([
      { content: "kept" },
      expect.objectContaining({ content: "Agent session complete." }),
    ]);
    expect(props.setLoadingResponse).toHaveBeenCalledWith(false);
    expect(props.setWebsocket).toHaveBeenLastCalledWith(null);
    expect(props.setSocketId).toHaveBeenCalledWith(null);

    hook.unmount();
    window.removeEventListener("agent-session-start", starts);
    window.removeEventListener("agent-session-end", ends);
    window.removeEventListener("attachment-clear", clears);
  });

  it("turns a message handler failure into an intentional terminal close", () => {
    const props = createProps({
      handleSocketResponse: vi.fn(() => {
        throw new Error("bad payload");
      }),
    });
    renderHook(() => useWebSocket(props));
    const socket = mocks.instances[0];

    act(() => socket.emit("message", { data: "bad" }));

    expect(mocks.logger.error).toHaveBeenCalledWith("Failed to parse data");
    expect(socket.closed).toBe(true);
    expect(props.setAgentSessionActive).toHaveBeenCalledWith(false);
    expect(props.setLoadingResponse).toHaveBeenCalledWith(false);
  });

  it("filters abort events by socket, workspace, and thread before closing", () => {
    const props = createProps();
    renderHook(() => useWebSocket(props));
    const socket = mocks.instances[0];

    act(() => {
      window.dispatchEvent(
        new CustomEvent("abort-chat-stream", {
          detail: { socketId: "other" },
        }),
      );
      window.dispatchEvent(
        new CustomEvent("abort-chat-stream", {
          detail: { socketId: "socket-1", workspaceSlug: "other" },
        }),
      );
      window.dispatchEvent(
        new CustomEvent("abort-chat-stream", {
          detail: {
            socketId: "socket-1",
            workspaceSlug: "workspace-a",
            threadSlug: "other",
          },
        }),
      );
    });
    expect(socket.closed).toBe(false);

    act(() => {
      window.dispatchEvent(
        new CustomEvent("abort-chat-stream", {
          detail: {
            socketId: "socket-1",
            workspaceSlug: "workspace-a",
            threadSlug: "thread-a",
          },
        }),
      );
    });
    expect(socket.closed).toBe(true);
  });

  it("skips the completion message for a pending reset", () => {
    const pendingResetRef = { current: true };
    const props = createProps({ pendingResetRef });
    renderHook(() => useWebSocket(props));
    const socket = mocks.instances[0];

    act(() => socket.emit("close", { code: 1008 }));

    expect(pendingResetRef.current).toBe(false);
    expect(props.setChatHistory).not.toHaveBeenCalled();
    expect(props.setLoadingResponse).toHaveBeenCalledWith(false);
  });

  it("reports constructor failures as abort messages and clears connection state", () => {
    mocks.setThrowOnConstruct(true);
    const props = createProps();

    renderHook(() => useWebSocket(props));

    expect(props.setChatHistory).toHaveBeenCalled();
    const updater = props.setChatHistory.mock.calls[0][0];
    expect(updater([{ content: "" }, { content: "kept" }])).toEqual([
      { content: "kept" },
      expect.objectContaining({
        type: "abort",
        content: "constructor boom",
        error: "constructor boom",
      }),
    ]);
    expect(props.setLoadingResponse).toHaveBeenCalledWith(false);
    expect(props.setWebsocket).toHaveBeenLastCalledWith(null);
    expect(props.setSocketId).toHaveBeenCalledWith(null);
  });

  it("closes the active socket during cleanup", () => {
    const props = createProps();
    const hook = renderHook(() => useWebSocket(props));
    const socket = mocks.instances[0];

    hook.unmount();

    expect(socket.closed).toBe(true);
    expect(props.setAgentSessionActive).toHaveBeenCalledWith(false);
  });
});
