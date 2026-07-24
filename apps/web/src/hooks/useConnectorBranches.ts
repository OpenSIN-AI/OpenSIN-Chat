// SPDX-License-Identifier: MIT
import useSWR from "swr";
import DataConnector from "@/models/dataConnector";

export const CACHE_KEY = "connector_branches";

export default function useConnectorBranches(
  provider: "github" | "gitlab",
  repo: string | null,
  accessToken: string | null,
) {
  const { data, error, isLoading, mutate } = useSWR(
    repo ? [CACHE_KEY, provider, repo, accessToken] : null,
    () => DataConnector[provider].branches({ repo, accessToken }),
  );
  return {
    branches: data?.branches ?? [],
    error: data?.error ?? error,
    isLoading,
    refresh: mutate,
    mutate,
  };
}
