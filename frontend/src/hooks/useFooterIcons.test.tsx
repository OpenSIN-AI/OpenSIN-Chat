// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

vi.mock("@/models/system", () => ({
  default: { fetchCustomFooterIcons: vi.fn() },
}));

import System from "@/models/system";
import useFooterIcons from "./useFooterIcons";

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useFooterIcons", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns empty array while loading", () => {
    System.fetchCustomFooterIcons.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useFooterIcons(), { wrapper });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.footerData).toEqual([]);
  });

  it("resolves footer data from API", async () => {
    vi.mocked(System.fetchCustomFooterIcons).mockResolvedValue({
      footerData: [{ icon: "GithubLogo", url: "https://github.com" }],
      error: null,
    });
    const { result } = renderHook(() => useFooterIcons(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.footerData).toEqual([
      { icon: "GithubLogo", url: "https://github.com" },
    ]);
  });
});
