// SPDX-License-Identifier: MIT
import useSWR from "swr";
import { API_BASE } from "@/utils/constants";
import { swrFetcher } from "@/utils/swrFetcher";

const DRUCKSACHEN_KEY = `${API_BASE}/utils/bundestag/drucksachen?rows=6`;
const RSS_KEY = `${API_BASE}/utils/political/rss`;

export function usePoliticalData() {
  const {
    data: drucksachenData,
    error: drucksachenError,
    isLoading: drucksachenLoading,
    mutate: mutateDrucksachen,
  } = useSWR(DRUCKSACHEN_KEY, swrFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30000,
  });

  const {
    data: rssData,
    error: rssError,
    isLoading: rssLoading,
    mutate: mutateRss,
  } = useSWR(RSS_KEY, swrFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30000,
  });

  return {
    drucksachen: drucksachenData?.documents || [],
    rssItems: rssData?.items || [],
    loadingDrucksachen: drucksachenLoading,
    loadingRss: rssLoading,
    errorDrucksachen: drucksachenError?.message || null,
    errorRss: rssError?.message || null,
    refreshDrucksachen: () => mutateDrucksachen(),
    refreshRss: () => mutateRss(),
    refreshAll: () => {
      mutateDrucksachen();
      mutateRss();
    },
  };
}

export default usePoliticalData;
