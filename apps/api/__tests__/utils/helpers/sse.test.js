// SPDX-License-Identifier: MIT
/**
 * Tests for the shared SSE heartbeat (utils/helpers/sse.js).
 * A leaked heartbeat interval keeps the event loop alive and writes to dead
 * sockets, so every exit path (manual stop, ended response, write throw)
 * must clear the timer. (Issue #369 chat audit.)
 */
const { startSSEHeartbeat } = require("../../../utils/helpers/sse");

function createResponse() {
  return {
    writableEnded: false,
    destroyed: false,
    write: jest.fn(() => true),
  };
}

describe("startSSEHeartbeat", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("writes a valid SSE comment line every 15 seconds", () => {
    const res = createResponse();
    const stop = startSSEHeartbeat(res);

    jest.advanceTimersByTime(15_000);
    expect(res.write).toHaveBeenCalledTimes(1);
    expect(res.write).toHaveBeenCalledWith(": heartbeat\n\n");

    jest.advanceTimersByTime(30_000);
    expect(res.write).toHaveBeenCalledTimes(3);
    stop();
  });

  it("stops writing after the stop function is called", () => {
    const res = createResponse();
    const stop = startSSEHeartbeat(res);

    jest.advanceTimersByTime(15_000);
    expect(res.write).toHaveBeenCalledTimes(1);

    stop();
    jest.advanceTimersByTime(60_000);
    expect(res.write).toHaveBeenCalledTimes(1);
  });

  it("self-clears when the response has already ended", () => {
    const res = createResponse();
    startSSEHeartbeat(res);

    res.writableEnded = true;
    jest.advanceTimersByTime(60_000);
    expect(res.write).not.toHaveBeenCalled();
    // The interval must have cleared itself — no pending timers remain.
    expect(jest.getTimerCount()).toBe(0);
  });

  it("self-clears when the response is destroyed", () => {
    const res = createResponse();
    startSSEHeartbeat(res);

    res.destroyed = true;
    jest.advanceTimersByTime(60_000);
    expect(res.write).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  it("self-clears when writing to the socket throws", () => {
    const res = createResponse();
    res.write.mockImplementation(() => {
      throw new Error("EPIPE");
    });
    startSSEHeartbeat(res);

    jest.advanceTimersByTime(15_000);
    expect(res.write).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(60_000);
    expect(res.write).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  it("calling stop twice is safe", () => {
    const res = createResponse();
    const stop = startSSEHeartbeat(res);
    stop();
    expect(() => stop()).not.toThrow();
  });
});
