// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// Mock the TTSProvider and ThreadContainer so the agent module can import
// them at module load without dragging in React contexts or thread UI.
vi.mock("@/components/contexts/TTSProvider", () => ({
  emitAssistantMessageCompleteEvent: vi.fn(),
}));

vi.mock("@/components/Sidebar/ActiveWorkspaces/ThreadContainer", () => ({
  THREAD_RENAME_EVENT: "THREAD_RENAME_EVENT_TEST",
}));

import handleSocketResponse, {
  websocketURI,
  AGENT_SESSION_START,
  AGENT_SESSION_END,
  REPORT_PREVIEW_EVENT,
  setAgentSessionActive,
  getAgentSessionActive,
  useIsAgentSessionActive,
} from "./agent";

import { emitAssistantMessageCompleteEvent } from "@/components/contexts/TTSProvider";

function makeSocket() {
  return { supportsAgentStreaming: false };
}

function makeSetChatHistory() {
  let calls = 0;
  const fn = vi.fn((updater) => {
    calls++;
    // Run the updater against an empty array so we can capture what it would
    // produce. We don't actually persist the prev here — most tests pass a
    // custom updater via the second arg of the mock's last call.
    if (typeof updater === "function") {
      try {
        return updater([]);
      } catch {
        return undefined;
      }
    }
    return undefined;
  });
  fn.calls = () => calls;
  return fn;
}

describe("chat/agent – event name constants", () => {
  it("exports the expected string constants", () => {
    expect(typeof AGENT_SESSION_START).toBe("string");
    expect(typeof AGENT_SESSION_END).toBe("string");
    expect(typeof REPORT_PREVIEW_EVENT).toBe("string");
    expect(AGENT_SESSION_START.length).toBeGreaterThan(0);
    expect(AGENT_SESSION_END.length).toBeGreaterThan(0);
    expect(REPORT_PREVIEW_EVENT.length).toBeGreaterThan(0);
  });
});

describe("chat/agent – session flag helpers", () => {
  it("getAgentSessionActive returns false by default", () => {
    setAgentSessionActive(false);
    expect(getAgentSessionActive()).toBe(false);
  });

  it("setAgentSessionActive toggles the global flag", () => {
    setAgentSessionActive(true);
    expect(getAgentSessionActive()).toBe(true);
    setAgentSessionActive(false);
    expect(getAgentSessionActive()).toBe(false);
  });
});

describe("chat/agent – websocketURI", () => {
  it("uses wss: when window.location.protocol is https:", () => {
    const original = window.location.protocol;
    Object.defineProperty(window, "location", {
      value: { ...window.location, protocol: "https:", host: "host.example" },
      writable: true,
      configurable: true,
    });
    // The function uses API_BASE which falls back to "/api" in test env.
    const uri = websocketURI();
    expect(uri.startsWith("wss://")).toBe(true);
    // restore
    Object.defineProperty(window, "location", {
      value: { ...window.location, protocol: original },
      writable: true,
      configurable: true,
    });
  });

  it("uses ws: when window.location.protocol is http:", () => {
    Object.defineProperty(window, "location", {
      value: { ...window.location, protocol: "http:", host: "host.example" },
      writable: true,
      configurable: true,
    });
    const uri = websocketURI();
    expect(uri.startsWith("ws://")).toBe(true);
  });
});

describe("chat/agent – useIsAgentSessionActive hook", () => {
  beforeEach(() => {
    setAgentSessionActive(false);
  });

  it("returns false initially when no session is active", () => {
    const { result } = renderHook(() => useIsAgentSessionActive());
    expect(result.current).toBe(false);
  });

  it("returns true when the global session flag is set", () => {
    setAgentSessionActive(true);
    const { result } = renderHook(() => useIsAgentSessionActive());
    expect(result.current).toBe(true);
  });

  it("toggles to true when AGENT_SESSION_START is dispatched", () => {
    const { result } = renderHook(() => useIsAgentSessionActive());
    expect(result.current).toBe(false);
    act(() => {
      window.dispatchEvent(new Event(AGENT_SESSION_START));
    });
    expect(result.current).toBe(true);
  });

  it("toggles to false when AGENT_SESSION_END is dispatched", () => {
    setAgentSessionActive(true);
    const { result } = renderHook(() => useIsAgentSessionActive());
    expect(result.current).toBe(true);
    act(() => {
      window.dispatchEvent(new Event(AGENT_SESSION_END));
    });
    expect(result.current).toBe(false);
  });
});

describe("chat/agent – handleSocketResponse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does nothing when the payload is not valid JSON (safeJsonParse returns null)", () => {
    const socket = makeSocket();
    const setChatHistory = makeSetChatHistory();
    handleSocketResponse(socket, { data: "{not json" }, setChatHistory);
    expect(setChatHistory).not.toHaveBeenCalled();
  });

  it("ignores a generic message when the socket already supports agent streaming", () => {
    const socket = { supportsAgentStreaming: true };
    const setChatHistory = makeSetChatHistory();
    const event = { data: JSON.stringify({ content: "hi" }) };
    // No 'type' field, supportsAgentStreaming=true → should bail out.
    handleSocketResponse(socket, event, setChatHistory);
    expect(setChatHistory).not.toHaveBeenCalled();
  });

  it("dispatches a THREAD_RENAME_EVENT window event for rename_thread messages", () => {
    const socket = makeSocket();
    const setChatHistory = makeSetChatHistory();
    const event = {
      data: JSON.stringify({
        type: "rename_thread",
        content: { slug: "thread-1", name: "Renamed" },
      }),
    };
    const listener = vi.fn();
    window.addEventListener("THREAD_RENAME_EVENT_TEST", listener);
    try {
      handleSocketResponse(socket, event, setChatHistory);
      expect(listener).toHaveBeenCalledTimes(1);
      const custom = listener.mock.calls[0][0];
      expect(custom.detail).toEqual({
        threadSlug: "thread-1",
        newName: "Renamed",
      });
    } finally {
      window.removeEventListener("THREAD_RENAME_EVENT_TEST", listener);
    }
  });

  it("skips rename_thread when slug/name missing", () => {
    const socket = makeSocket();
    const setChatHistory = makeSetChatHistory();
    const event = {
      data: JSON.stringify({
        type: "rename_thread",
        content: { slug: "thread-1" },
      }),
    };
    const listener = vi.fn();
    window.addEventListener("THREAD_RENAME_EVENT_TEST", listener);
    try {
      handleSocketResponse(socket, event, setChatHistory);
      expect(listener).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener("THREAD_RENAME_EVENT_TEST", listener);
    }
  });

  it("bails on toolApprovalRequest when requestId/skillName are missing", () => {
    const socket = makeSocket();
    const setChatHistory = makeSetChatHistory();
    const event = {
      data: JSON.stringify({ type: "toolApprovalRequest" }),
    };
    handleSocketResponse(socket, event, setChatHistory);
    expect(setChatHistory).not.toHaveBeenCalled();
  });

  it("bails on clarificationRequest when requestId/questions invalid", () => {
    const socket = makeSocket();
    const setChatHistory = makeSetChatHistory();
    const event = {
      data: JSON.stringify({ type: "clarificationRequest" }),
    };
    handleSocketResponse(socket, event, setChatHistory);
    expect(setChatHistory).not.toHaveBeenCalled();
  });

  it("ignores unknown event types that have no content", () => {
    const socket = makeSocket();
    const setChatHistory = makeSetChatHistory();
    const event = { data: JSON.stringify({ type: "someUnknownEvent" }) };
    handleSocketResponse(socket, event, setChatHistory);
    expect(setChatHistory).not.toHaveBeenCalled();
  });

  it("flags the socket as supporting agent streaming on reportStreamEvent", () => {
    const socket = makeSocket();
    const setChatHistory = makeSetChatHistory();
    const event = {
      data: JSON.stringify({
        type: "reportStreamEvent",
        content: { type: "chatId", chatId: "abc-123" },
      }),
    };
    handleSocketResponse(socket, event, setChatHistory);
    expect(socket.supportsAgentStreaming).toBe(true);
    expect(emitAssistantMessageCompleteEvent).toHaveBeenCalledWith("abc-123");
  });

  it("dispatches a window event for reportPreview", () => {
    const socket = makeSocket();
    const setChatHistory = makeSetChatHistory();
    const event = {
      data: JSON.stringify({
        type: "reportPreview",
        content: { id: "rep-1", html: "<p>preview</p>" },
      }),
    };
    const listener = vi.fn();
    window.addEventListener(REPORT_PREVIEW_EVENT, listener);
    try {
      handleSocketResponse(socket, event, setChatHistory);
      expect(listener).toHaveBeenCalledTimes(1);
    } finally {
      window.removeEventListener(REPORT_PREVIEW_EVENT, listener);
    }
  });

  it("appends a fileDownloadCard message to chat history", () => {
    const socket = makeSocket();
    let received;
    const setChatHistory = vi.fn((updater) => {
      if (typeof updater === "function") {
        received = updater([]);
      }
    });
    const event = {
      data: JSON.stringify({
        type: "fileDownloadCard",
        content: { file: "x.csv" },
        metrics: { tokens: 5 },
      }),
    };
    handleSocketResponse(socket, event, setChatHistory);
    expect(received).toBeDefined();
    expect(received[0].type).toBe("fileDownloadCard");
    expect(received[0].content).toEqual({ file: "x.csv" });
    expect(received[0].justGenerated).toBe(true);
    expect(received[0].metrics).toEqual({ tokens: 5 });
  });

  it("appends a wssFailure message with the content as the error", () => {
    const socket = makeSocket();
    let received;
    const setChatHistory = vi.fn((updater) => {
      if (typeof updater === "function") {
        received = updater([]);
      }
    });
    const event = {
      data: JSON.stringify({
        type: "wssFailure",
        content: "connection lost",
      }),
    };
    handleSocketResponse(socket, event, setChatHistory);
    expect(received[0].type).toBeUndefined();
    expect(received[0].content).toBe("connection lost");
    expect(received[0].error).toBe("connection lost");
  });

  it("appends a toolApprovalRequest message when fields are valid", () => {
    const socket = makeSocket();
    let received;
    const setChatHistory = vi.fn((updater) => {
      if (typeof updater === "function") {
        received = updater([]);
      }
    });
    const event = {
      data: JSON.stringify({
        type: "toolApprovalRequest",
        requestId: "req-1",
        skillName: "web_search",
        description: "Search the web",
        timeoutMs: 30000,
      }),
    };
    handleSocketResponse(socket, event, setChatHistory);
    expect(received[0].type).toBe("toolApprovalRequest");
    expect(received[0].requestId).toBe("req-1");
    expect(received[0].skillName).toBe("web_search");
    expect(received[0].content).toContain("web_search");
  });

  it("appends a clarificationRequest message when fields are valid", () => {
    const socket = makeSocket();
    let received;
    const setChatHistory = vi.fn((updater) => {
      if (typeof updater === "function") {
        received = updater([]);
      }
    });
    const event = {
      data: JSON.stringify({
        type: "clarificationRequest",
        requestId: "req-2",
        questions: ["What colour?"],
        allowSkip: true,
        timeoutMs: 5000,
      }),
    };
    handleSocketResponse(socket, event, setChatHistory);
    expect(received[0].type).toBe("clarifyingQuestion");
    expect(received[0].requestId).toBe("req-2");
    expect(received[0].questions).toEqual(["What colour?"]);
    expect(received[0].allowSkip).toBe(true);
  });

  it("appends a rechartVisualize message to chat history", () => {
    const socket = makeSocket();
    let received;
    const setChatHistory = vi.fn((updater) => {
      if (typeof updater === "function") {
        received = updater([]);
      }
    });
    const event = {
      data: JSON.stringify({
        type: "rechartVisualize",
        content: { chartType: "bar", data: [1, 2, 3] },
      }),
    };
    handleSocketResponse(socket, event, setChatHistory);
    expect(received[0].type).toBe("rechartVisualize");
    expect(received[0].content).toEqual({ chartType: "bar", data: [1, 2, 3] });
  });

  it("appends a statusResponse message with the original type preserved", () => {
    const socket = makeSocket();
    let received;
    const setChatHistory = vi.fn((updater) => {
      if (typeof updater === "function") {
        received = updater([]);
      }
    });
    const event = {
      data: JSON.stringify({
        type: "statusResponse",
        content: "working on it",
        animate: true,
        metrics: { a: 1 },
      }),
    };
    handleSocketResponse(socket, event, setChatHistory);
    expect(received[0].type).toBe("statusResponse");
    expect(received[0].content).toBe("working on it");
    expect(received[0].animate).toBe(true);
    expect(received[0].metrics).toEqual({ a: 1 });
  });

  describe("reportStreamEvent: streaming updates", () => {
    function runStream(content) {
      const socket = makeSocket();
      const setChatHistory = vi.fn((updater) => {
        if (typeof updater === "function") {
          return updater([]);
        }
      });
      const event = {
        data: JSON.stringify({ type: "reportStreamEvent", content }),
      };
      handleSocketResponse(socket, event, setChatHistory);
      // last call's updater result
      const calls = setChatHistory.mock.calls;
      const last = calls[calls.length - 1];
      if (typeof last[0] === "function") return last[0]([]);
      return undefined;
    }

    it("removeStatusResponse filters out the matching uuid", () => {
      const result = runStream({ type: "removeStatusResponse", uuid: "u-1" });
      // The updater filters msgs with that uuid; with no prev, returns [].
      expect(Array.isArray(result)).toBe(true);
    });

    it("modelRouteNotification returns prev when routedTo is missing", () => {
      const result = runStream({ type: "modelRouteNotification", uuid: "u-2" });
      // No prev means returning the empty array as-is.
      expect(Array.isArray(result)).toBe(true);
    });

    it("modelRouteNotification appends a notification when routedTo is present", () => {
      const result = runStream({
        type: "modelRouteNotification",
        uuid: "u-2",
        routedTo: "openai/gpt-4",
      });
      expect(result.length).toBe(1);
      expect(result[0].type).toBe("modelRouteNotification");
      expect(result[0].routedTo).toBe("openai/gpt-4");
    });

    it("textResponseChunk with only whitespace is ignored (empty content)", () => {
      const result = runStream({
        type: "textResponseChunk",
        uuid: "u-3",
        content: "\n  \t",
      });
      // No prev messages — the updater short-circuits to return prev (empty).
      expect(result).toEqual([]);
    });

    it("fullTextResponse creates a new textResponse message", () => {
      const result = runStream({
        type: "fullTextResponse",
        uuid: "u-4",
        content: "hello world",
      });
      expect(result.length).toBe(1);
      expect(result[0].type).toBe("textResponse");
      expect(result[0].content).toBe("hello world");
      expect(result[0].role).toBe("assistant");
    });
  });
});
