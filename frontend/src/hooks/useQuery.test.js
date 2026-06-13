// SPDX-License-Identifier: MIT
import { describe, it, expect, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import useQuery from "./useQuery";

describe("useQuery", () => {
  afterEach(() => {
    window.history.pushState({}, "", "/");
  });

  it("returns URLSearchParams for the current query string", () => {
    window.history.pushState({}, "", "?foo=bar&baz=1");
    const { result } = renderHook(() => useQuery());
    expect(result.current.get("foo")).toBe("bar");
    expect(result.current.get("baz")).toBe("1");
  });
});
