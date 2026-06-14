// SPDX-License-Identifier: MIT
import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import useLoginMode from "./useLoginMode";

describe("useLoginMode", () => {
  beforeEach(() => {
    window.localStorage.getItem.mockImplementation(() => null);
  });

  it("returns 'multi' when user and token are present", async () => {
    window.localStorage.getItem.mockImplementation((key) => {
      if (key === "openafd_user") return "{}";
      if (key === "openafd_authToken") return "token";
      return null;
    });
    const { result } = renderHook(() => useLoginMode());
    await waitFor(() => expect(result.current).toBe("multi"));
  });

  it("returns 'single' when only token is present", async () => {
    window.localStorage.getItem.mockImplementation((key) => {
      if (key === "openafd_authToken") return "token";
      return null;
    });
    const { result } = renderHook(() => useLoginMode());
    await waitFor(() => expect(result.current).toBe("single"));
  });

  it("returns null when no token is present", async () => {
    const { result } = renderHook(() => useLoginMode());
    await waitFor(() => expect(result.current).toBeNull());
  });
});
