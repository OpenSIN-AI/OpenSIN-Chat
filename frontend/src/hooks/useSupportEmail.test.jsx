// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

vi.mock("@/models/system", () => ({
  default: {
    fetchSupportEmail: vi.fn(),
  },
}));

import System from "@/models/system";
import useSupportEmail, { SUPPORT_EMAIL_KEY } from "./useSupportEmail";

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useSupportEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the support email", async () => {
    System.fetchSupportEmail.mockResolvedValue({
      email: "support@example.com",
    });

    const { result } = renderHook(() => useSupportEmail(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.email).toBe("");
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.email).toBe("support@example.com");
    expect(System.fetchSupportEmail).toHaveBeenCalledTimes(1);
  });

  it("returns empty string when the fetch fails", async () => {
    System.fetchSupportEmail.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useSupportEmail(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.email).toBe("");
    expect(result.current.error).toBeTruthy();
  });

  it("uses a stable cache key", () => {
    expect(SUPPORT_EMAIL_KEY).toBe("system/support-email");
  });
});
