// SPDX-License-Identifier: MIT
import { useEffect } from "react";
import useSWR from "swr";
import System from "@/models/system";

/**
 * SWR cache key for the list of all local documents. Exported so that mutations
 * elsewhere (create/delete/move) can revalidate the list via
 * `mutate(DOCUMENTS_KEY)` without re-declaring the string.
 */
export const DOCUMENTS_KEY = "documents";

/**
 * Fetches all local documents with caching, request de-duplication and
 * stale-while-revalidate. Replaces the common
 * `useEffect(() => { System.localFiles().then(setFiles) }, [])` pattern.
 *
 * @returns {{
 *   documents: object | null,
 *   isLoading: boolean,
 *   error: Error | undefined,
 *   refresh: () => Promise<any>,
 *   mutate: import("swr").KeyedMutator<any>
 * }}
 */
export default function useDocuments() {
  const { data, error, isLoading, mutate } = useSWR(DOCUMENTS_KEY, () =>
    System.localFiles(),
  );

  return {
    documents: data || null,
    isLoading,
    error,
    refresh: mutate,
    mutate,
  };
}
