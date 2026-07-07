// SPDX-License-Identifier: MIT
// Tests for useQuery hook — URL parameter handling.
// Issue #391
import { describe, it, expect, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { createElement } from "react";
import useQuery from "./useQuery";

function renderHookWithRouter(initialPath: string) {
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    createElement(MemoryRouter, { initialEntries: [initialPath] }, children);
  return renderHook(() => useQuery(), { wrapper });
}

describe("useQuery – URL parameter handling", () => {
  afterEach(() => {
    window.history.pushState({}, "", "/");
  });

  it("returns URLSearchParams for a single query parameter", () => {
    const { result } = renderHookWithRouter("/?foo=bar");
    expect(result.current.get("foo")).toBe("bar");
  });

  it("returns URLSearchParams for multiple query parameters", () => {
    const { result } = renderHookWithRouter("/?foo=bar&baz=qux");
    expect(result.current.get("foo")).toBe("bar");
    expect(result.current.get("baz")).toBe("qux");
  });

  it("returns null for a non-existent parameter", () => {
    const { result } = renderHookWithRouter("/?foo=bar");
    expect(result.current.get("nonexistent")).toBeNull();
  });

  it("handles numeric query parameters as strings", () => {
    const { result } = renderHookWithRouter("/?count=42&page=1");
    expect(result.current.get("count")).toBe("42");
    expect(result.current.get("page")).toBe("1");
  });

  it("returns empty URLSearchParams when no query string is present", () => {
    const { result } = renderHookWithRouter("/");
    expect(result.current.get("foo")).toBeNull();
    expect(result.current.toString()).toBe("");
  });

  it("handles URL-encoded values", () => {
    const { result } = renderHookWithRouter("/?q=hello%20world");
    expect(result.current.get("q")).toBe("hello world");
  });

  it("handles parameters with special characters", () => {
    const { result } = renderHookWithRouter("/?filter=name%3Djohn");
    expect(result.current.get("filter")).toBe("name=john");
  });

  it("handles empty parameter values", () => {
    const { result } = renderHookWithRouter("/?foo=&bar=baz");
    expect(result.current.get("foo")).toBe("");
    expect(result.current.get("bar")).toBe("baz");
  });

  it("handles multiple values for the same parameter", () => {
    const { result } = renderHookWithRouter("/?tag=a&tag=b");
    expect(result.current.getAll("tag")).toEqual(["a", "b"]);
  });

  it("returns a URLSearchParams instance", () => {
    const { result } = renderHookWithRouter("/?foo=bar");
    expect(result.current).toBeInstanceOf(URLSearchParams);
  });

  it("has has() method that works correctly", () => {
    const { result } = renderHookWithRouter("/?foo=bar");
    expect(result.current.has("foo")).toBe(true);
    expect(result.current.has("missing")).toBe(false);
  });
});
