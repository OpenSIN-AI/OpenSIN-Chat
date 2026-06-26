// SPDX-License-Identifier: MIT
import { useCallback, useContext } from "react";
import { useSWRConfig } from "swr";
import { AuthContext, userKey } from "@/AuthContext";

/**
 * SWR cache key for the currently authenticated user. Falsy when not logged
 * in so SWR skips the request entirely.
 *
 * @type {string}
 */
export { userKey };

/**
 * Reads the currently authenticated user from AuthContext.
 *
 * AuthProvider owns the single `system/refresh-user` SWR request. Keeping this
 * hook context-only prevents every `useUser()` consumer from mounting its own
 * auth refresh request while preserving the shared SWR refresh handle.
 *
 * @returns {{
 *   user: object | null,
 *   success: boolean | undefined,
 *   message: string | undefined,
 *   isLoading: boolean,
 *   error: Error | undefined,
 *   refresh: () => Promise<any>,
 *   mutate: import("swr").KeyedMutator<any>
 * }}
 */
export default function useUser() {
  const auth = useContext(AuthContext);
  const { mutate } = useSWRConfig();
  const store = auth?.store ?? { user: null, authToken: null };
  const refresh = useCallback(() => mutate(userKey), [mutate]);

  return {
    user: store.user ?? null,
    success: store.authToken ? true : undefined,
    message: undefined,
    isLoading: false,
    error: undefined,
    refresh,
    mutate: refresh,
  };
}
