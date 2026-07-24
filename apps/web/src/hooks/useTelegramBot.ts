// SPDX-License-Identifier: MIT
import useSWR from "swr";
import Telegram from "@/models/telegram";

export const TELEGRAM_BOT_KEY = "telegram-bot";

export default function useTelegramBot() {
  const { data, error, isLoading, mutate } = useSWR(
    TELEGRAM_BOT_KEY,
    () => Telegram.getConfig(),
    { revalidateOnFocus: false },
  );

  return {
    config: data?.config ?? null,
    isLoading,
    error,
    refresh: mutate,
    mutate,
  };
}
