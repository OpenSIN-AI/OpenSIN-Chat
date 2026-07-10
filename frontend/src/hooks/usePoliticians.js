// SPDX-License-Identifier: MIT
import { useMemo, useState } from "react";
import useSWR from "swr";
import { swrFetcher } from "@/utils/swrFetcher";

/**
 * Maps an /api/politician/search record to the shape the DatabaseSidebar
 * expects (matching the legacy /utils/bundestag/politicians format).
 */
function mapPolitician(p) {
  return {
    id: p.id,
    first_name: p.firstName || null,
    last_name: p.lastName || null,
    label: p.fullName || null,
    party: { label: p.party || null },
    constituency: p.electoralDistrict ? { label: p.electoralDistrict } : null,
    electoral_data: p.electoralDistrict
      ? { constituency: { label: p.electoralDistrict } }
      : null,
    abgeordnetenwatch_url: p.profileUrl || null,
    photo: p.photoUrl || null,
    state: p.state || null,
  };
}

/**
 * Hook for searching and filtering the local politician database.
 * Defaults to no party filter ("Alle Parteien") so the visible dropdown label
 * matches the actual query — previously the filter was locked to "AfD" while
 * the dropdown showed "Alle Parteien", causing name searches for non-AfD
 * politicians (e.g. "Merz") to silently return nothing. The AfD party remains
 * selectable from the dropdown.
 */
export function usePoliticians() {
  const [query, setQuery] = useState("");
  const [party, setParty] = useState("");
  const [state, setState] = useState("");

  const params = useMemo(() => {
    const searchParams = new URLSearchParams();
    if (query.trim()) searchParams.set("q", query.trim());
    if (party) searchParams.set("party", party);
    if (state) searchParams.set("state", state);
    return searchParams.toString();
  }, [query, party, state]);

  const key = params
    ? `/api/politician/search?${params}`
    : "/api/politician/search";

  const { data, error, isLoading, mutate } = useSWR(key, swrFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30000,
  });

  // The server returns HTTP 200 with an `error` field when the upstream
  // API (Abgeordnetenwatch) is unavailable. SWR treats 200 as success,
  // so we need to surface the body-level error to the UI.
  const bodyError = data?.error || null;
  return {
    politicians: useMemo(
      () => (data?.politicians || []).map(mapPolitician),
      [data],
    ),
    loading: isLoading,
    error: error?.message || bodyError,
    refresh: () => mutate(),
    filters: {
      query,
      setQuery,
      party,
      setParty,
      state,
      setState,
    },
  };
}

export default usePoliticians;
