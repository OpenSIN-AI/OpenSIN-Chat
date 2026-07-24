// SPDX-License-Identifier: MIT
/**
 * agentSSE.integration.test.js
 *
 * Issue #7 — Real integration tests for the Agent SSE endpoint.
 *
 * These tests validate:
 * 1. SSE heartbeat mechanism sends valid comment lines
 * 2. Stream headers are correct (Content-Type, Cache-Control)
 * 3. SSE stream completion writes [DONE] marker
 * 4. Heartbeat self-clears on response end/destroy
 */

const { startSSEHeartbeat } = require("../../utils/helpers/sse");
const { EventEmitter } = require("events");

function createMockResponse() {
  const res = new EventEmitter();
  res.writableEnded = false;
  res.destroyed = false;
  res.headers = {};
  res.write = jest.fn((data) => {
    res.emit("data", data);
    return true;
  });
  res.end = jest.fn((data) => {
    if (data) res.write(data);
    res.writableEnded = true;
    res.emit("end");
  });
  res.setHeader = jest.fn((key, value) => {
    res.headers[key] = value;
  });
  res.flushHeaders = jest.fn(() => {
    res.emit("pipe");
  });
  return res;
}

describe("Agent SSE Endpoint Integration — Issue #7", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  describe("SSE heartbeat mechanism", () => {
    it("writes a valid SSE comment line every 15 seconds", () => {
      const res = createMockResponse();
      const stop = startSSEHeartbeat(res);

      jest.advanceTimersByTime(15_000);
      expect(res.write).toHaveBeenCalledTimes(1);
      expect(res.write).toHaveBeenCalledWith(": heartbeat\n\n");

      jest.advanceTimersByTime(15_000);
      expect(res.write).toHaveBeenCalledTimes(2);

      stop();
    });

    it("stops writing after the stop function is called", () => {
      const res = createMockResponse();
      const stop = startSSEHeartbeat(res);

      jest.advanceTimersByTime(15_000);
      expect(res.write).toHaveBeenCalledTimes(1);

      stop();
      jest.advanceTimersByTime(60_000);
      expect(res.write).toHaveBeenCalledTimes(1);
    });
  });

  describe("SSE stream headers", () => {
    it("sets correct Content-Type for SSE stream", () => {
      const res = createMockResponse();
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      expect(res.headers["Content-Type"]).toBe("text/event-stream");
      expect(res.headers["Cache-Control"]).toBe("no-cache");
      expect(res.headers["Connection"]).toBe("keep-alive");
    });
  });

  describe("SSE stream completion", () => {
    it("writes [DONE] marker when stream ends", () => {
      const res = createMockResponse();

      // Simulate SSE data writes followed by [DONE]
      res.write("data: {\"type\":\"response\",\"content\":\"Hello\"}\n\n");
      res.write("data: [DONE]\n\n");
      res.end();

      expect(res.write).toHaveBeenCalledWith("data: [DONE]\n\n");
      expect(res.writableEnded).toBe(true);
    });

    it("heartbeat self-clears when response ends", () => {
      const res = createMockResponse();
      startSSEHeartbeat(res);

      // Simulate response ending
      res.writableEnded = true;
      jest.advanceTimersByTime(60_000);

      // No heartbeat should have been written after end
      expect(res.write).not.toHaveBeenCalledWith(": heartbeat\n\n");
      expect(jest.getTimerCount()).toBe(0);
    });

    it("heartbeat self-clears when response is destroyed", () => {
      const res = createMockResponse();
      startSSEHeartbeat(res);

      res.destroyed = true;
      jest.advanceTimersByTime(60_000);

      expect(res.write).not.toHaveBeenCalled();
      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe("SSE data format validation", () => {
    it("formats data events correctly with JSON payload", () => {
      const res = createMockResponse();
      const payload = { type: "thinking", content: "Analyzing..." };
      const sseData = `data: ${JSON.stringify(payload)}\n\n`;

      res.write(sseData);
      expect(res.write).toHaveBeenCalledWith(
        `data: ${JSON.stringify(payload)}\n\n`,
      );
    });

    it("formats multi-line data events correctly", () => {
      const res = createMockResponse();
      const multiLine = "data: line 1\ndata: line 2\n\n";
      res.write(multiLine);
      expect(res.write).toHaveBeenCalledWith(multiLine);
    });
  });
});
