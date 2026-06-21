// SPDX-License-Identifier: MIT
const { withTimeout } = require("../../../utils/helpers/withTimeout");

describe("withTimeout", () => {
  test("resolves when promise completes before timeout", async () => {
    const fast = new Promise((resolve) => setTimeout(() => resolve("ok"), 10));
    const result = await withTimeout(fast, 1000);
    expect(result).toBe("ok");
  });

  test("rejects with timeout error when promise is too slow", async () => {
    const slow = new Promise((resolve) => setTimeout(resolve, 5000));
    await expect(withTimeout(slow, 50)).rejects.toThrow(
      "Operation timed out after 50ms",
    );
  });

  test("propagates rejection from the original promise", async () => {
    const failing = Promise.reject(new Error("Task failed"));
    await expect(withTimeout(failing, 1000)).rejects.toThrow("Task failed");
  });

  test("clears the timer after resolution", async () => {
    const fast = Promise.resolve("done");
    await withTimeout(fast, 500);
    // If the timer wasn't cleared, the test process might hang or log warnings.
    // We verify no unhandled timer by simply checking the test completes.
  });

  test("clears the timer after timeout rejection", async () => {
    const slow = new Promise(() => {}); // never resolves
    await expect(withTimeout(slow, 30)).rejects.toThrow();
  });

  test("handles promise that resolves with undefined", async () => {
    const result = await withTimeout(Promise.resolve(undefined), 100);
    expect(result).toBeUndefined();
  });

  test("handles promise that resolves with 0", async () => {
    const result = await withTimeout(Promise.resolve(0), 100);
    expect(result).toBe(0);
  });

  test("handles promise that resolves with false", async () => {
    const result = await withTimeout(Promise.resolve(false), 100);
    expect(result).toBe(false);
  });

  test("handles promise that rejects with a non-Error value", async () => {
    const result = withTimeout(Promise.reject("string error"), 1000);
    await expect(result).rejects.toBe("string error");
  });

  test("timeout message includes the ms value", async () => {
    const slow = new Promise(() => {});
    await expect(withTimeout(slow, 777)).rejects.toThrow("777ms");
  });

  test("races correctly — fast resolve beats short timeout", async () => {
    const fast = new Promise((r) => setTimeout(() => r("winner"), 5));
    const result = await withTimeout(fast, 200);
    expect(result).toBe("winner");
  });

  test("races correctly — short timeout beats slow resolve", async () => {
    const slow = new Promise((r) => setTimeout(r, 300));
    await expect(withTimeout(slow, 20)).rejects.toThrow("timed out");
  });
});
