// SPDX-License-Identifier: MIT
import { API_BASE, AUTH_TOKEN } from "@/utils/constants";
import { safeGetItem } from "@/utils/safeStorage";

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
  const base = `${host}/api/sse/agent/${socketId}`;
  const token = safeGetItem(AUTH_TOKEN);
  if (!token) return base;
  const url = new URL(base);
  url.searchParams.set("token", token);
  return url.toString();
}

function ssePostUrl(socketId: string) {
  const host = sseBaseHost() || window.location.origin;
  const base = `${host}/api/sse/agent/${socketId}/message`;
  const token = safeGetItem(AUTH_TOKEN);
  if (!token) return base;
  const url = new URL(base);
  url.searchParams.set("token", token);
  return url.toString();
}

export default class SSESocket {
  readyState: number = CONNECTING;
  supportsAgentStreaming: boolean = false;
  binaryType: string = "blob";
  bufferedAmount: number = 0;
  extensions: string = "";
  protocol: string = "";
  url: string;

  private eventSource: EventSource | null = null;
  private postUrl: string;
  private listeners: Map<string, Set<EventListener>> = new Map();
  private isIntentionalClose: boolean = false;

  constructor(socketId: string) {
    this.url = sseStreamUrl(socketId);
    this.postUrl = ssePostUrl(socketId);
    this._connect();
  }

  private _connect() {
    try {
      this.eventSource = new EventSource(this.url);
    } catch (e) {
      this.readyState = CLOSED;
      this._dispatch("error", new Event("error"));
      return;
    }

    this.eventSource.onopen = () => {
      this.readyState = OPEN;
      this._dispatch("open", new Event("open"));
    };

    this.eventSource.onmessage = (event: MessageEvent) => {
      const fakeEvent = {
        data: event.data,
      } as MessageEvent;
      this._dispatch("message", fakeEvent);
    };

    this.eventSource.onerror = () => {
      if (
        this.isIntentionalClose ||
        this.eventSource?.readyState === EventSource.CLOSED
      ) {
        this.readyState = CLOSED;
        this._dispatch("close", new CloseEvent("close"));
        return;
      }
      this._dispatch("error", new Event("error"));
    };
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
      headers: { "Content-Type": "application/json" },
      body: data,
      keepalive: true,
    }).catch(() => {});
  }

  close(code?: number, reason?: string) {
    this.isIntentionalClose = true;
    this.readyState = CLOSING;
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
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
