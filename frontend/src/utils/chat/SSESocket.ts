// SPDX-License-Identifier: MIT
import { API_BASE, AUTH_TOKEN } from "@/utils/constants";
import { safeGetItem } from "@/utils/safeStorage";
import { fetchEventSource } from "@microsoft/fetch-event-source";

const CONNECTING = 0;
const OPEN = 1;
const CLOSING = 2;
const CLOSED = 3;

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
        } else {
          this.readyState = CLOSED;
          this._dispatch("error", new Event("error"));
          throw new Error(`SSE connection failed: ${response.status}`);
        }
      },

      onmessage: (event) => {
        const fakeEvent = { data: event.data } as MessageEvent;
        this._dispatch("message", fakeEvent);
      },

      onerror: (err) => {
        if (this.isIntentionalClose) {
          this.readyState = CLOSED;
          this._dispatch("close", new CloseEvent("close"));
          throw err; // Stop retrying
        }
        this._dispatch("error", new Event("error"));
        // fetch-event-source auto-retries; don't throw to allow retry
      },

      onclose: () => {
        this.readyState = CLOSED;
        this._dispatch("close", new CloseEvent("close"));
      },
    }).catch(() => {
      // Connection ended or errored out
      if (this.readyState !== CLOSED) {
        this.readyState = CLOSED;
        this._dispatch("close", new CloseEvent("close"));
      }
    });
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
    this.readyState = CLOSED;
    this._dispatch(
      "close",
      new CloseEvent("close", { code: code || 1000, reason: reason || "" }),
    );
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
