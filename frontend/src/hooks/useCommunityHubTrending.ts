// SPDX-License-Identifier: MIT
import useSWR from "swr";
import CommunityHub from "@/models/communityHub";

export const COMMUNITY_HUB_TRENDING_KEY = "community-hub/trending";

const DEFAULT_EXPLORE_ITEMS = {
  agentSkills: { items: [], hasMore: false, totalCount: 0 },
  systemPrompts: { items: [], hasMore: false, totalCount: 0 },
  slashCommands: { items: [], hasMore: false, totalCount: 0 },
};

export default function useCommunityHubTrending() {
  const { data, error, isLoading, mutate } = useSWR(
    COMMUNITY_HUB_TRENDING_KEY,
    async () => {
      const { success, result } = await CommunityHub.fetchExploreItems();
      return success ? result : DEFAULT_EXPLORE_ITEMS;
    },
    { revalidateOnFocus: false },
  );

  return {
    exploreItems: data ?? DEFAULT_EXPLORE_ITEMS,
    isLoading,
    error,
    refresh: mutate,
    mutate,
  };
}
