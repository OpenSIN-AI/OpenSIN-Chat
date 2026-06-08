// SPDX-License-Identifier: MIT
import { useEffect } from "react";
import useSWR from "swr";
import Workspace from "@/models/workspace";

/**
 * Builds the SWR cache key for a workspace's parsed document list.
 * Returns `null` when no slug is provided so SWR skips the request entirely
 * (conditional fetching).
 *
 * @param {string} slug - workspace slug
 * @param {string|null} threadSlug - optional thread slug
 * @returns {[string, string, string|null] | null}
 */
export const workspaceDocumentKey = (slug, threadSlug = null) =>
  slug ? ["workspace-documents", slug, threadSlug] : null;

/**
 * Fetches a workspace's parsed files with caching, de-duplication and
 * stale-while-revalidate. Replaces the common
 * `useEffect(() => { Workspace.getParsedFiles(slug, threadSlug).then(setFiles) }, [slug, threadSlug])`
 * pattern.
 *
 * @param {string} slug - Workspace slug. Falsy values disable the fetch.
 * @param {string|null} threadSlug - Optional thread slug.
 * @returns {{
 *   document: { files: Array<object>, contextWindow: number, currentContextTokenCount: number } | null,
 *   isLoading: boolean,
 *   error: Error | undefined,
 *   refresh: () => Promise<any>,
 *   mutate: import("swr").KeyedMutator<any>
 * }}
 */
export default function useDocument(slug, threadSlug = null) {
  const { data, error, isLoading, mutate } = useSWR(
    workspaceDocumentKey(slug, threadSlug),
    () => Workspace.getParsedFiles(slug, threadSlug),
  );

  return {
    document: data || null,
    isLoading,
    error,
    refresh: mutate,
    mutate,
  };
}
