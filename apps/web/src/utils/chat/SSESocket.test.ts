// SPDX-License-Identifier: MIT
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchEventSourceMock } = vi.hoisted(() => ({
  fetchEventSourceMock: vi.fn(),
}));

vi.mock("@microsoft/fetch-event-source", () => ({
  fetchEventSource: fetchEventSourceMock,
}));

vi.mock("@/utils/safeStorage", () => ({
  safeGetItem: vi.fn(() => "test-token"),
}));

import SSESocket from "./SSESocket";

describe("SSESocket", () => {
  let callbacks: Record<string, any>;

  beforeEach(() => {
    callbacks = {};
    fetchEventSourceMock.mockImplementation((_url, options) => {
      callbacks = options;
      return new Promise(() => {});
    });
  });

  it("preserves a named server close event and does not emit it as chat data", () => {
    const socket = new SSESocket("agent-1");
    const closeListener = vi.fn();
    const messageListener = vi.fn();
    socket.addEventListener("close", closeListener);
    socket.addEventListener("message", messageListener);

    callbacks.onmessage({
      event: "close",
      data: JSON.stringify({ code: 1008, reason: "Session ended" }),
    });
    callbacks.onclose();

    expect(messageListener).not.toHaveBeenCalled();
    expect(closeListener).toHaveBeenCalledTimes(1);
    const event = closeListener.mock.calls[0][0] as CloseEvent;
    expect(event.code).toBe(1008);
    expect(event.reason).toBe("Session ended");
    expect(socket.readyState).toBe(socket.CLOSED);
  });

  it("maps a clean server EOF to a normal terminal close", () => {
    const socket = new SSESocket("agent-2");
    const closeListener = vi.fn();
    socket.addEventListener("close", closeListener);

    callbacks.onclose();

    expect(closeListener).toHaveBeenCalledTimes(1);
    const event = closeListener.mock.calls[0][0] as CloseEvent;
    expect(event.code).toBe(1000);
    expect(event.wasClean).toBe(true);
  });

  it("keeps ordinary SSE messages compatible with the WebSocket handler", () => {
    const socket = new SSESocket("agent-3");
    const messageListener = vi.fn();
    socket.addEventListener("message", messageListener);

    callbacks.onmessage({
      event: "message",
      data: '{"type":"statusResponse"}',
    });

    expect(messageListener).toHaveBeenCalledTimes(1);
    expect(messageListener.mock.calls[0][0].data).toBe(
      '{"type":"statusResponse"}',
    );
  });

  it("stops retrying fatal HTTP setup failures", async () => {
    const socket = new SSESocket("agent-4");
    const closeListener = vi.fn();
    socket.addEventListener("close", closeListener);

    let error: unknown;
    try {
      await callbacks.onopen({ ok: false, status: 401 });
    } catch (caught) {
      error = caught;
    }

    expect(() => callbacks.onerror(error)).toThrow(
      /SSE connection failed: 401/,
    );
    expect(closeListener).toHaveBeenCalledTimes(1);
    expect(closeListener.mock.calls[0][0].code).toBe(1008);
  });
});
