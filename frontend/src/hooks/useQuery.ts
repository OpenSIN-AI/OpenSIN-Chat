// SPDX-License-Identifier: MIT
import { useMemo } from "react";
import { useLocation } from "react-router-dom";

/**
 * Returns a reactive URLSearchParams that updates on SPA navigation.
 * Previously this hook returned `new URLSearchParams(window.location.search)`
 * directly, which meant components using it showed stale query parameters
 * after client-side route changes.
 */
export default function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}
