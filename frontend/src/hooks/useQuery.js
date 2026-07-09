// SPDX-License-Identifier: MIT
import { useMemo } from "react";

/**
 * Returns a URLSearchParams instance for the current URL query string.
 * Reads directly from window.location so it does not require a Router context.
 */
export default function useQuery() {
  const search = typeof window !== "undefined" ? window.location.search : "";
  return useMemo(() => new URLSearchParams(search), [search]);
}
