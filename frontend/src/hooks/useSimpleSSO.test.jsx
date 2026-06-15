// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import React from "react";

// Mock useSystemSettings since useSimpleSSO now delegates to it
vi.mock("@/hooks/useSystemSettings", () => ({
  default: vi.fn(),
}));

import useSystemSettings from "@/hooks/useSystemSettings";
import useSimpleSSO from "./useSimpleSSO";

// Provide a fresh SWR cache per test to avoid cross-test cache bleed
const wrapper = ({ children }) =>
  React.createElement(SWRConfig, { value: { provider: () => new Map() } }, children);

describe("useSimpleSSO", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads SSO config", async () => {
    useSystemSettings.mockReturnValue({
      settings: {
        SimpleSSOEnabled: true,
        SimpleSSONoLogin: true,
        SimpleSSONoLoginRedirect: "/sso",
      },
      loading: false,
    });
    const { result } = renderHook(() => useSimpleSSO(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.ssoConfig.enabled).toBe(true);
    expect(result.current.ssoConfig.noLoginRedirect).toBe("/sso");
  });

  it("handles errors gracefully", async () => {
    useSystemSettings.mockReturnValue({
      settings: {},
      loading: false,
    });
    const { result } = renderHook(() => useSimpleSSO(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.ssoConfig.enabled).toBe(false);
  });
});
