// SPDX-License-Identifier: MIT
import useSWR from "swr";
import CommunityHub from "@/models/communityHub";

export const COMMUNITY_HUB_SETTINGS_KEY = "community-hub/settings";

export default function useCommunityHubSettings() {
  const { data, error, isLoading, mutate } = useSWR(
    COMMUNITY_HUB_SETTINGS_KEY,
    () => CommunityHub.getSettings(),
    { revalidateOnFocus: false }
  );

  return {
    settings: data ?? { connectionKey: null },
    isLoading,
    error,
    refresh: mutate,
    mutate,
  };
}
