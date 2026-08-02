// SPDX-License-Identifier: MIT
import { API_BASE, AUTH_TOKEN } from "@/utils/constants";
import { safeGetItem } from "@/utils/safeStorage";
import { fetchEventSource } from "@microsoft/fetch-event-source";

const CONNECTING = 0;
const OPEN = 1;
const CLOSING = 2;
const CLOSED = 3;

class FatalSSEError extends Error {
  closeCode: number;

  constructor(message: string, closeCode = 1008) {
    super(message);
    this.name = "FatalSSEError";
    this.closeCode = closeCode;
  }
}

function sseBaseHost() {
  const apiBase = import.meta.env.VITE_API_BASE || API_BASE;
  if (!apiBase || apiBase.startsWith("/")) {
    return "";
  }
  try {
    return new URL(apiBase).origin;
  } catch {
    return "";
  }
}

function sseStreamUrl(socketId: string) {
  const host = sseBaseHost() || window.location.origin;
  return `${host}/api/sse/agent/${socketId}`;
}

function ssePostUrl(socketId: string) {
  const host = sseBaseHost() || window.location.origin;
  return `${host}/api/sse/agent/${socketId}/message`;
}

function authHeaders(): Record<string, string> {
  const token = safeGetItem(AUTH_TOKEN);
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export default class SSESocket {
  readyState: number = CONNECTING;
  supportsAgentStreaming: boolean = false;
  binaryType: string = "blob";
  bufferedAmount: number = 0;
  extensions: string = "";
  protocol: string = "";
  url: string;

  private postUrl: string;
  private listeners: Map<string, Set<EventListener>> = new Map();
  private isIntentionalClose: boolean = false;
  private abortController: AbortController | null = null;
  private closeDispatched: boolean = false;
  private serverCloseCode: number | null = null;
  private serverCloseReason: string = "";

  constructor(socketId: string) {
    this.url = sseStreamUrl(socketId);
    this.postUrl = ssePostUrl(socketId);
    this._connect();
  }

  private _connect() {
    this.abortController = new AbortController();

    fetchEventSource(this.url, {
      method: "GET",
      headers: {
        Accept: "text/event-stream",
        ...authHeaders(),
      },
      signal: this.abortController.signal,
      openWhenHidden: true,

      onopen: async (response) => {
        if (response.ok) {
          this.readyState = OPEN;
          this._dispatch("open", new Event("open"));
          return;
        }

        const error = new FatalSSEError(
          `SSE connection failed: ${response.status}`,
        );
        throw error;
      },

      onmessage: (event) => {
        // The API sends a named `close` SSE event before ending a completed or
        // permanently closed agent invocation. Preserve its WebSocket-style
        // close code so useWebSocket can distinguish a terminal 1000/1008
        // close from a transient network interruption. Treating this payload
        // as an ordinary message caused an endless reconnect loop against the
        // same closed invocation UUID until the rate limiter returned 429.
        if (event.event === "close") {
          try {
            const payload = JSON.parse(event.data || "{}");
            this.serverCloseCode =
              Number.isInteger(payload?.code) && payload.code > 0
                ? payload.code
                : 1000;
            this.serverCloseReason =
              typeof payload?.reason === "string" ? payload.reason : "";
          } catch {
            this.serverCloseCode = 1000;
            this.serverCloseReason = "";
          }
          this._dispatchClose(
            this.serverCloseCode || 1000,
            this.serverCloseReason,
          );
          // The named server close is terminal. Abort fetch-event-source
          // immediately so its transport cannot retry the already-closed
          // invocation UUID and append a false session-ended error.
          if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
          }
          return;
        }

        const fakeEvent = { data: event.data } as MessageEvent;
        this._dispatch("message", fakeEvent);
      },

      onerror: (err) => {
        if (this.isIntentionalClose) {
          this._dispatchClose(1000, "Client closed connection");
          throw err; // Stop retrying
        }
        if (err instanceof FatalSSEError) {
          this._dispatch("error", new Event("error"));
          this._dispatchClose(err.closeCode, err.message);
          throw err; // Authentication/policy failures cannot self-heal.
        }
        this._dispatch("error", new Event("error"));
        // fetch-event-source auto-retries transient transport failures.
      },

      onclose: () => {
        // A clean EOF means the server intentionally completed this agent
        // stream. Do not turn it into a reconnectable code-0 close.
        this._dispatchClose(
          this.serverCloseCode || 1000,
          this.serverCloseReason || "Agent stream complete",
        );
      },
    }).catch(() => {
      // A fatal connection setup error reaches here after onerror rethrows.
      // Ensure consumers always receive exactly one terminal close event.
      this._dispatchClose(
        this.serverCloseCode || 1008,
        this.serverCloseReason || "SSE connection ended",
      );
    });
  }

  private _dispatchClose(code: number, reason: string) {
    if (this.closeDispatched) return;
    this.closeDispatched = true;
    this.readyState = CLOSED;
    this._dispatch(
      "close",
      new CloseEvent("close", { code, reason, wasClean: code === 1000 }),
    );
  }

  private _dispatch(type: string, event: Event) {
    const handlers = this.listeners.get(type);
    if (handlers) {
      handlers.forEach((fn) => fn(event));
    }
  }

  send(data: string) {
    if (this.readyState !== OPEN) return;
    fetch(this.postUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: data,
      keepalive: true,
    }).catch(() => {});
  }

  close(code?: number, reason?: string) {
    this.isIntentionalClose = true;
    this.readyState = CLOSING;
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this._dispatchClose(code || 1000, reason || "");
  }

  addEventListener(type: string, listener: EventListener) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);
  }

  removeEventListener(type: string, listener: EventListener) {
    const handlers = this.listeners.get(type);
    if (handlers) {
      handlers.delete(listener);
    }
  }

  dispatchEvent(event: Event): boolean {
    this._dispatch(event.type, event);
    return true;
  }

  static get CONNECTING() {
    return CONNECTING;
  }
  static get OPEN() {
    return OPEN;
  }
  static get CLOSING() {
    return CLOSING;
  }
  static get CLOSED() {
    return CLOSED;
  }

  get CONNECTING() {
    return CONNECTING;
  }
  get OPEN() {
    return OPEN;
  }
  get CLOSING() {
    return CLOSING;
  }
  get CLOSED() {
    return CLOSED;
  }
}
