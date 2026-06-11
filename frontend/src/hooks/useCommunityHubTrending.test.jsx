// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

vi.mock("@/models/communityHub", () => ({
  default: {
    fetchExploreItems: vi.fn(),
  },
}));

import CommunityHub from "@/models/communityHub";
import useCommunityHubTrending, {
  COMMUNITY_HUB_TRENDING_KEY,
} from "./useCommunityHubTrending";

const DEFAULT_EXPLORE_ITEMS = {
  agentSkills: { items: [], hasMore: false, totalCount: 0 },
  systemPrompts: { items: [], hasMore: false, totalCount: 0 },
  slashCommands: { items: [], hasMore: false, totalCount: 0 },
};

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useCommunityHubTrending", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns default value while loading", () => {
    CommunityHub.fetchExploreItems.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useCommunityHubTrending(), { wrapper });
    expect(result.current.exploreItems).toEqual(DEFAULT_EXPLORE_ITEMS);
    expect(result.current.isLoading).toBe(true);
  });

  it("returns data on success", async () => {
    const fakeResult = {
      agentSkills: { items: [{ id: "1" }], hasMore: false, totalCount: 1 },
      systemPrompts: { items: [], hasMore: false, totalCount: 0 },
      slashCommands: { items: [], hasMore: false, totalCount: 0 },
    };
    CommunityHub.fetchExploreItems.mockResolvedValue({
      success: true,
      result: fakeResult,
    });
    const { result } = renderHook(() => useCommunityHubTrending(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.exploreItems).toEqual(fakeResult);
  });

  it("returns default when fetch is not successful", async () => {
    CommunityHub.fetchExploreItems.mockResolvedValue({
      success: false,
      result: null,
    });
    const { result } = renderHook(() => useCommunityHubTrending(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.exploreItems).toEqual(DEFAULT_EXPLORE_ITEMS);
  });

  it("captures errors", async () => {
    CommunityHub.fetchExploreItems.mockRejectedValue(new Error("fail"));
    const { result } = renderHook(() => useCommunityHubTrending(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeTruthy();
  });

  it("exposes a stable cache key", () => {
    expect(COMMUNITY_HUB_TRENDING_KEY).toBe("community-hub/trending");
  });
});
