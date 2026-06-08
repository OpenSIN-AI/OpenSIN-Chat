// SPDX-License-Identifier: MIT
import useSWR from "swr";
import System from "@/models/system";

export const CAN_VIEW_CHAT_HISTORY_KEY = "system/can-view-chat-history";

export function useCanViewChatHistory() {
  const { data, error, isLoading, mutate } = useSWR(
    CAN_VIEW_CHAT_HISTORY_KEY,
    () => System.fetchCanViewChatHistory(),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    },
  );

  return {
    viewable: data?.viewable ?? false,
    loading: isLoading,
    error,
    refresh: mutate,
    mutate,
  };
}

export default useCanViewChatHistory;
