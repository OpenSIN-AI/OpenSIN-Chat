// SPDX-License-Identifier: MIT
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { streamSSEPost } from "./sseStream";

function responseFromChunks(chunks: string[], init: ResponseInit = {}) {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Response(body, { status: 200, ...init });
}

describe("streamSSEPost", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reports fetch failures, including non-Error values", async () => {
    const onerror = vi.fn();
    vi.mocked(fetch).mockRejectedValueOnce(new Error("offline"));
    await streamSSEPost("/events", { method: "POST", onerror });
    expect(onerror).toHaveBeenLastCalledWith(
      expect.objectContaining({ message: "offline" }),
    );

    vi.mocked(fetch).mockRejectedValueOnce("network down");
    await streamSSEPost("/events", { onerror });
    expect(onerror).toHaveBeenLastCalledWith(
      expect.objectContaining({ message: "network down" }),
    );
  });

  it("calls onopen and reports non-ok or bodyless responses", async () => {
    const onopen = vi.fn(async () => undefined);
    const onerror = vi.fn();
    vi.mocked(fetch).mockResolvedValueOnce(new Response("no", { status: 503 }));

    await streamSSEPost("/events", {
      headers: { "x-test": "1" },
      onopen,
      onerror,
    });

    expect(fetch).toHaveBeenCalledWith("/events", {
      headers: { "x-test": "1" },
      signal: undefined,
    });
    expect(onopen).toHaveBeenCalledWith(
      expect.objectContaining({ status: 503 }),
    );
    expect(onerror).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "SSE request failed with status 503",
      }),
    );

    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 200 }));
    await streamSSEPost("/bodyless", { onerror });
    expect(onerror).toHaveBeenLastCalledWith(
      expect.objectContaining({
        message: "SSE request failed with status 200",
      }),
    );
  });

  it("parses chunked events, comments, sticky ids, retry hints, and final leftovers", async () => {
    const onmessage = vi.fn();
    const onclose = vi.fn();
    vi.mocked(fetch).mockResolvedValueOnce(
      responseFromChunks([
        ": heartbeat\n",
        "id: 7\nevent: progress\ndata: first",
        " line\ndata: second\nretry: 1000\n\n",
        "unknown: ignored\nfield-without-colon\n\n",
        "data:last\n\n",
        "data: trailing",
      ]),
    );

    await streamSSEPost("/events", { method: "POST", onmessage, onclose });

    expect(onmessage.mock.calls.map(([event]) => event)).toEqual([
      { data: "" },
      { data: "first line\nsecond", event: "progress", id: "7" },
      { data: "last", event: undefined, id: "7" },
      { data: "trailing", event: undefined, id: "7" },
    ]);
    expect(onclose).toHaveBeenCalledTimes(1);
  });

  it("skips empty events and handles CR-only event separators", async () => {
    const onmessage = vi.fn();
    vi.mocked(fetch).mockResolvedValueOnce(
      responseFromChunks(["event: noop\n\r\ndata: ok\n\n"]),
    );

    await streamSSEPost("/events", { onmessage });

    expect(onmessage).toHaveBeenCalledTimes(1);
    expect(onmessage).toHaveBeenCalledWith({
      data: "ok",
      event: undefined,
      id: undefined,
    });
  });

  it("treats an already-aborted signal as an intentional close", async () => {
    const controller = new AbortController();
    controller.abort();
    const onerror = vi.fn();
    const onclose = vi.fn();
    vi.mocked(fetch).mockResolvedValueOnce(
      responseFromChunks(["data: ignored\n\n"]),
    );

    await streamSSEPost("/events", {
      signal: controller.signal,
      onerror,
      onclose,
    });

    expect(onerror).not.toHaveBeenCalled();
    expect(onclose).toHaveBeenCalledTimes(1);
  });

  it("suppresses AbortError reader failures and reports ordinary reader failures", async () => {
    const abortBody = new ReadableStream<Uint8Array>({
      start(controller) {
        const error = new Error("aborted");
        error.name = "AbortError";
        controller.error(error);
      },
    });
    const onerror = vi.fn();
    const onclose = vi.fn();
    vi.mocked(fetch).mockResolvedValueOnce(new Response(abortBody));

    await streamSSEPost("/abort", { onerror, onclose });
    expect(onerror).not.toHaveBeenCalled();
    expect(onclose).toHaveBeenCalledTimes(1);

    const failingBody = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.error(new Error("reader boom"));
      },
    });
    vi.mocked(fetch).mockResolvedValueOnce(new Response(failingBody));
    await streamSSEPost("/failure", { onerror, onclose });
    expect(onerror).toHaveBeenLastCalledWith(
      expect.objectContaining({ message: "reader boom" }),
    );
    expect(onclose).toHaveBeenCalledTimes(2);
  });
});
