// SPDX-License-Identifier: MIT

import { useEffect, useState } from "react";
import { searchOpenSIN } from "./api";
import type { GlobalSearchResult, GlobalSearchType } from "./types";

const SEARCH_DELAY_MS = 180;

export default function useGlobalSearch({
  query,
  types,
  enabled = true,
}: {
  query: string;
  types?: GlobalSearchType[];
  enabled?: boolean;
}) {
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<
    Partial<Record<GlobalSearchType, number>>
  >({});

  useEffect(() => {
    const normalized = query.trim();

    if (!enabled || normalized.length < 2) {
      setResults([]);
      setCounts({});
      setError(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await searchOpenSIN({
          query: normalized,
          types,
          signal: controller.signal,
        });

        setResults(response.results);
        setCounts(response.counts);
      } catch (requestError) {
        if (controller.signal.aborted) return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : String(requestError),
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, SEARCH_DELAY_MS);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query, enabled, JSON.stringify(types || [])]);

  return { results, loading, error, counts };
}
