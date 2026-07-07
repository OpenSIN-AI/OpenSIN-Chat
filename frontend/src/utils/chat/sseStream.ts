// SPDX-License-Identifier: MIT
// Native SSE streaming over POST — replaces @microsoft/fetch-event-source.
// Uses fetch + ReadableStream so no extra package is needed.

export interface SSECallbacks {
  onopen?: (response: Response) => Promise<void>;
  onmessage?: (event: { data: string; event?: string; id?: string }) => void;
  onerror?: (err: Error) => void;
  onclose?: () => void;
}

/**
 * Stream Server-Sent Events over a POST (or GET) request using the native
 * Fetch + ReadableStream API.  Parses the `text/event-stream` wire format
 * line-by-line and invokes the supplied callbacks, matching the
 * fetch-event-source behaviour that the rest of the codebase expects.
 */
export async function streamSSEPost(
  url: string,
  options: RequestInit & SSECallbacks,
): Promise<void> {
  const { onopen, onmessage, onerror, onclose, signal, ...fetchOpts } = options;

  let response: Response;
  try {
    response = await fetch(url, { ...fetchOpts, signal });
  } catch (err) {
    onerror?.(err instanceof Error ? err : new Error(String(err)));
    return;
  }

  if (onopen) {
    await onopen(response);
  }

  if (!response.ok || !response.body) {
    onerror?.(new Error(`SSE request failed with status ${response.status}`));
    return;
  }

  const reader = response.body
    .pipeThrough(new TextDecoderStream())
    .getReader();

  let buffer = "";

  // Pending event fields
  let eventType = "";
  let eventData = "";
  let eventId = "";

  function dispatchEvent() {
    if (eventData === "") {
      // No data — reset and skip
      eventType = "";
      eventId = "";
      return;
    }
    // Strip trailing newline from data per spec
    const data = eventData.endsWith("\n")
      ? eventData.slice(0, -1)
      : eventData;
    onmessage?.({ data, event: eventType || undefined, id: eventId || undefined });
    eventType = "";
    eventData = "";
    // eventId is sticky — do NOT reset per SSE spec
  }

  try {
    while (true) {
      if (signal?.aborted) break;

      const { value, done } = await reader.read();
      if (done) break;

      buffer += value;
      const lines = buffer.split("\n");
      // Keep last (potentially incomplete) line in the buffer
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (line === "" || line === "\r") {
          // Empty line = dispatch the buffered event
          dispatchEvent();
          continue;
        }

        if (line.startsWith(":")) {
          // SSE comment / heartbeat — treat as a ping: fire onmessage with
          // empty data so stall timers can reset, matching fetch-event-source
          // behaviour.
          onmessage?.({ data: "" });
          continue;
        }

        const colonIdx = line.indexOf(":");
        if (colonIdx === -1) {
          // Field with no value
          continue;
        }

        const field = line.slice(0, colonIdx);
        // Spec: if the char after ":" is a space, strip it
        const value = line.slice(colonIdx + (line[colonIdx + 1] === " " ? 2 : 1));

        switch (field) {
          case "data":
            eventData += value + "\n";
            break;
          case "event":
            eventType = value;
            break;
          case "id":
            eventId = value;
            break;
          case "retry":
            // Ignore retry hints — we do not auto-reconnect
            break;
        }
      }
    }

    // Dispatch any leftover event that didn't end with a blank line
    if (eventData) dispatchEvent();
  } catch (err) {
    if (signal?.aborted || (err instanceof Error && err.name === "AbortError")) {
      // Intentional abort — not an error
    } else {
      onerror?.(err instanceof Error ? err : new Error(String(err)));
    }
  } finally {
    reader.releaseLock();
    onclose?.();
  }
}
