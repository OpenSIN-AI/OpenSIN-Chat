// SPDX-License-Identifier: MIT
import useSWR from "swr";
import Workspace from "@/models/workspace";

export const SUGGESTED_MESSAGES_KEY = "workspace/suggested-messages";

export default function useSuggestedMessages(slug) {
  const { data, error, isLoading, mutate } = useSWR(
    slug ? [SUGGESTED_MESSAGES_KEY, slug] : null,
    () => Workspace.getSuggestedMessages(slug),
  );

  return {
    suggestedMessages: data ?? [],
    isLoading,
    error,
    refresh: mutate,
    mutate,
  };
}
