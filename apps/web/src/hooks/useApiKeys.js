// SPDX-License-Identifier: MIT
import useSWR from "swr";
import Admin from "@/models/admin";
import System from "@/models/system";
import { userFromStorage } from "@/utils/request";

export const API_KEYS_KEY = "system/api-keys";

export default function useApiKeys() {
  const { data, error, isLoading, mutate } = useSWR(API_KEYS_KEY, async () => {
    const user = userFromStorage();
    const Model = !!user ? Admin : System;
    const { apiKeys } = await Model.getApiKeys();
    return apiKeys;
  });

  return {
    apiKeys: data ?? [],
    isLoading,
    error,
    refresh: mutate,
    mutate,
  };
}
