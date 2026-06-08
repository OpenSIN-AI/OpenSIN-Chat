// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { safeJsonParse, baseHeaders, userFromStorage } from "./request";

describe("safeJsonParse", () => {
  it("parses valid JSON", () => {
    expect(safeJsonParse('{"name":"test"}')).toEqual({ name: "test" });
  });

  it("returns fallback for invalid JSON", () => {
    expect(safeJsonParse("{bad json}", "fallback")).toBe("fallback");
  });

  it("returns fallback for null input", () => {
    expect(safeJsonParse(null, "fallback")).toBe("fallback");
  });

  it("returns fallback for undefined input", () => {
    expect(safeJsonParse(undefined, "fallback")).toBe("fallback");
  });

  it("defaults fallback to null", () => {
    expect(safeJsonParse("not json")).toBe(null);
  });
});

describe("baseHeaders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns Bearer token when provided", () => {
    expect(baseHeaders("my-token")).toEqual({
      Authorization: "Bearer my-token",
    });
  });

  it("falls back to stored token", () => {
    window.localStorage.getItem = vi.fn((key) => {
      if (key === "openafd_authToken") return "stored-token";
      return null;
    });
    expect(baseHeaders()).toEqual({
      Authorization: "Bearer stored-token",
    });
  });

  it("returns null Authorization when no token available", () => {
    window.localStorage.getItem = vi.fn(() => null);
    expect(baseHeaders()).toEqual({ Authorization: null });
  });
});

describe("userFromStorage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns parsed user from localStorage", () => {
    const user = { id: 1, username: "admin" };
    window.localStorage.getItem = vi.fn((key) => {
      if (key === "openafd_user") return JSON.stringify(user);
      return null;
    });
    expect(userFromStorage()).toEqual(user);
  });

  it("returns null when no user stored", () => {
    window.localStorage.getItem = vi.fn(() => null);
    expect(userFromStorage()).toBe(null);
  });

  it("returns null for invalid JSON in storage", () => {
    window.localStorage.getItem = vi.fn((key) => {
      if (key === "openafd_user") return "{invalid}";
      return null;
    });
    expect(userFromStorage()).toBe(null);
  });
});
