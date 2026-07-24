// SPDX-License-Identifier: MIT
import useSWR from "swr";
import { swrFetcher } from "@/utils/swrFetcher";

const DRUCKSACHEN_KEY = "/utils/bundestag/drucksachen?rows=6";
const RSS_KEY = "/utils/political/rss";

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

  // The server returns HTTP 200 with an `error` field when upstream APIs
  // (Bundestag DIP, AfD RSS) are unavailable. SWR treats 200 as success,
  // so we surface the body-level error to the UI.
  const drucksachenBodyError = drucksachenData?.error || null;
  const rssBodyError = rssData?.error || null;

  return {
    drucksachen: drucksachenData?.documents || [],
    rssItems: rssData?.items || [],
    loadingDrucksachen: drucksachenLoading,
    loadingRss: rssLoading,
    errorDrucksachen: drucksachenError?.message || drucksachenBodyError,
    errorRss: rssError?.message || rssBodyError,
    refreshDrucksachen: () => mutateDrucksachen(),
    refreshRss: () => mutateRss(),
    refreshAll: () => {
      mutateDrucksachen();
      mutateRss();
    },
  };
}

export default usePoliticalData;
