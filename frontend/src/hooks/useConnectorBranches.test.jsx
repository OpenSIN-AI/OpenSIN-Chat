// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

vi.mock("@/models/dataConnector", () => ({
  default: {
    github: { branches: vi.fn() },
    gitlab: { branches: vi.fn() },
  },
}));

import DataConnector from "@/models/dataConnector";
import useConnectorBranches, { CACHE_KEY } from "./useConnectorBranches";

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useConnectorBranches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty branches when repo is null", () => {
    const { result } = renderHook(
      () => useConnectorBranches("github", null, null),
      { wrapper },
    );
    expect(result.current.branches).toEqual([]);
  });

  it("returns branches when repo is provided", async () => {
    DataConnector.github.branches.mockResolvedValue({
      branches: ["main", "dev"],
      error: null,
    });

    const { result } = renderHook(
      () => useConnectorBranches("github", "owner/repo", "token"),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.branches).toEqual(["main", "dev"]);
  });

  it("exports CACHE_KEY", () => {
    expect(CACHE_KEY).toBe("connector_branches");
  });
});
