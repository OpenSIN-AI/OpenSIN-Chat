// SPDX-License-Identifier: MIT
import useSWR from "swr";
import { API_BASE } from "@/utils/constants";
import { swrFetcher } from "@/utils/swrFetcher";

const RESEARCH_POLITICIANS_KEY = `${API_BASE}/utils/bundestag/politicians?limit=8`;
const RESEARCH_DRUCKSACHEN_KEY = `${API_BASE}/utils/bundestag/drucksachen?rows=6`;
const RESEARCH_RSS_KEY = `${API_BASE}/utils/political/rss`;

/**
 * Fetches research data (politicians, bundestag drucksachen, and RSS feeds)
 * with caching, request de-duplication and stale-while-revalidate.
 *
 * @returns {{
 *   politicians: Array<object>,
 *   drucksachen: Array<object>,
 *   rssItems: Array<object>,
 *   isLoadingPoliticians: boolean,
 *   isLoadingDrucksachen: boolean,
 *   isLoadingRss: boolean,
 *   error: Error | null,
 *   refresh: () => void,
 *   refreshAll: () => void,
 * }}
 */
export default function useResearch() {
  const {
    data: politiciansData,
    error: politiciansError,
    isLoading: politiciansLoading,
    mutate: mutatePoliticians,
  } = useSWR(RESEARCH_POLITICIANS_KEY, swrFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30000,
  });

  const {
    data: drucksachenData,
    error: drucksachenError,
    isLoading: drucksachenLoading,
    mutate: mutateDrucksachen,
  } = useSWR(RESEARCH_DRUCKSACHEN_KEY, swrFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30000,
  });

  const {
    data: rssData,
    error: rssError,
    isLoading: rssLoading,
    mutate: mutateRss,
  } = useSWR(RESEARCH_RSS_KEY, swrFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30000,
  });

  const error = politiciansError || drucksachenError || rssError || null;

  return {
    politicians: politiciansData?.data || [],
    drucksachen: drucksachenData?.documents || [],
    rssItems: rssData?.items || [],
    isLoadingPoliticians: politiciansLoading,
    isLoadingDrucksachen: drucksachenLoading,
    isLoadingRss: rssLoading,
    error: error ? error.message || String(error) : null,
    refresh: () => {
      mutatePoliticians();
      mutateDrucksachen();
      mutateRss();
    },
    refreshPoliticians: () => mutatePoliticians(),
    refreshDrucksachen: () => mutateDrucksachen(),
    refreshRss: () => mutateRss(),
    refreshAll: () => {
      mutatePoliticians();
      mutateDrucksachen();
      mutateRss();
    },
  };
}
