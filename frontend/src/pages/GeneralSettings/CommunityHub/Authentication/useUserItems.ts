// SPDX-License-Identifier: MIT
// Docs: useUserItems.doc.md
import { useState, useEffect } from "react";
import CommunityHub from "@/models/communityHub";

type UserItems = {
  createdByMe: Record<string, { items: any[] }>;
  teamItems: any[];
};

const DEFAULT_USER_ITEMS: UserItems = {
  createdByMe: {
    agentSkills: { items: [] },
    systemPrompts: { items: [] },
    slashCommands: { items: [] },
    agentFlows: { items: [] },
  },
  teamItems: [],
};

type UseUserItemsOptions = {
  connectionKey: string;
};

type UseUserItemsResult = {
  loading: boolean;
  userItems: UserItems;
};

export function useUserItems({
  connectionKey,
}: UseUserItemsOptions): UseUserItemsResult {
  const [loading, setLoading] = useState(true);
  const [userItems, setUserItems] = useState<UserItems>(DEFAULT_USER_ITEMS);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      if (!connectionKey) return;
      setLoading(true);
      try {
        const { success, createdByMe, teamItems } =
          await CommunityHub.fetchUserItems();
        if (cancelled) return;
        if (success) {
          setUserItems({ createdByMe, teamItems });
        }
      } catch (error) {
        if (cancelled) return;
        console.error("Error fetching user items:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [connectionKey]);

  return { loading, userItems };
}
