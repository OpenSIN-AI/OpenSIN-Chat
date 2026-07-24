// SPDX-License-Identifier: MIT
import useSWR from "swr";
import Telegram from "@/models/telegram";

export const TELEGRAM_USERS_KEY = "telegram-users";

export default function useTelegramUsers() {
  const { data, error, isLoading, mutate } = useSWR(
    TELEGRAM_USERS_KEY,
    async () => {
      const [pending, approved] = await Promise.all([
        Telegram.getPendingUsers(),
        Telegram.getApprovedUsers(),
      ]);
      return {
        pendingUsers: pending?.users || [],
        approvedUsers: approved?.users || [],
      };
    },
    { revalidateOnFocus: false, refreshInterval: 5000 },
  );

  return {
    pendingUsers: data?.pendingUsers ?? [],
    approvedUsers: data?.approvedUsers ?? [],
    isLoading,
    error,
    refresh: mutate,
    mutate,
  };
}
