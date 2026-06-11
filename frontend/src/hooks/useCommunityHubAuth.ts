// SPDX-License-Identifier: MIT
import useSWR from "swr";
import CommunityHub from "@/models/communityHub";
import { COMMUNITY_HUB_SETTINGS_KEY } from "./useCommunityHubSettings";

export const COMMUNITY_HUB_AUTH_KEY = COMMUNITY_HUB_SETTINGS_KEY;

export default function useCommunityHubAuth() {
  const { data, isLoading } = useSWR(
    COMMUNITY_HUB_AUTH_KEY,
    () => CommunityHub.getSettings(),
    { revalidateOnFocus: false },
  );

  const connectionKey = data?.connectionKey ?? null;
  return {
    isAuthenticated: !!connectionKey,
    loading: isLoading,
  };
}
