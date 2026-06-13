// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

vi.mock("@/models/system", () => ({
  default: { keys: vi.fn() },
}));

import System from "@/models/system";
import useSimpleSSO from "./useSimpleSSO";

describe("useSimpleSSO", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads SSO config", async () => {
    System.keys.mockResolvedValue({
      SimpleSSOEnabled: true,
      SimpleSSONoLogin: true,
      SimpleSSONoLoginRedirect: "/sso",
    });
    const { result } = renderHook(() => useSimpleSSO());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.ssoConfig.enabled).toBe(true);
    expect(result.current.ssoConfig.noLoginRedirect).toBe("/sso");
  });

  it("handles errors gracefully", async () => {
    System.keys.mockRejectedValue(new Error("fail"));
    const { result } = renderHook(() => useSimpleSSO());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.ssoConfig.enabled).toBe(false);
  });
});
