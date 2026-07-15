// SPDX-License-Identifier: MIT
import { useMemo } from "react";
import { useLocation } from "react-router";

/**
 * Returns a URLSearchParams instance for the current URL query string.
 * Re-memoizes whenever the router location's search string changes.
 */
export default function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}
