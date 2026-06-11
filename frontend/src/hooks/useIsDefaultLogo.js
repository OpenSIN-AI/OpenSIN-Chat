// SPDX-License-Identifier: MIT
import useSWR from "swr";
import System from "@/models/system";

export const IS_DEFAULT_LOGO_KEY = "system/is-default-logo";

export default function useIsDefaultLogo() {
  const { data, error, isLoading, mutate } = useSWR(IS_DEFAULT_LOGO_KEY, () =>
    System.isDefaultLogo(),
  );

  return {
    isDefaultLogo: data ?? true,
    isLoading,
    error,
    refresh: mutate,
    mutate,
  };
}
