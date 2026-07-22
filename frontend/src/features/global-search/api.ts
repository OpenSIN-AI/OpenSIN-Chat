// SPDX-License-Identifier: MIT

import { API_BASE } from "@/utils/constants";
import { baseHeaders } from "@/utils/request";
import type { GlobalSearchResponse, GlobalSearchType } from "./types";

export async function searchOpenSIN({
  query,
  types,
  limit = 30,
  signal,
}: {
  query: string;
  types?: GlobalSearchType[];
  limit?: number;
  signal?: AbortSignal;
}): Promise<GlobalSearchResponse> {
  const params = new URLSearchParams();
  params.set("q", query);
  params.set("limit", String(limit));

  if (types && types.length) {
    params.set("types", types.join(","));
  }

  const response = await fetch(`${API_BASE}/global-search?${params}`, {
    headers: baseHeaders(),
    signal,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || "Search failed.");
  }

  return data;
}
