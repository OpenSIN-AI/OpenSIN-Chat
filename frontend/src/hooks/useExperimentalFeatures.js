// SPDX-License-Identifier: MIT
import useSWR from "swr";
import Admin from "@/models/admin";

export const EXPERIMENTAL_FEATURES_KEY = "admin/experimental-features";

export default function useExperimentalFeatures() {
  const { data, error, isLoading, mutate } = useSWR(
    EXPERIMENTAL_FEATURES_KEY,
    async () => {
      const { settings } = await Admin.systemPreferencesByFields([
        "feature_flags",
      ]);
      return settings?.feature_flags ?? {};
    },
  );

  return {
    featureFlags: data ?? {},
    isLoading,
    error,
    refresh: mutate,
    mutate,
  };
}
