// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import validateSessionTokenForUser from "@/utils/session";

describe("validateSessionTokenForUser", () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it("returns true when response status is 200", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 200 }));
    const result = await validateSessionTokenForUser();
    expect(result).toBe(true);
  });

  it("returns false when response status is not 200", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 401 }));
    const result = await validateSessionTokenForUser();
    expect(result).toBe(false);
  });

  it("returns false on network error", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
    const result = await validateSessionTokenForUser();
    expect(result).toBe(false);
  });
});
