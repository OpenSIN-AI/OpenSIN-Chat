// SPDX-License-Identifier: MIT
import useSWR from "swr";
import Admin from "@/models/admin";

/**
 * SWR cache key for agent SQL connections.
 */
export const AGENT_SQL_CONNECTIONS_KEY = "agent-sql-connections";

/**
 * Fetches configured SQL connections with caching.
 *
 * @returns {{
 *   connections: Array<object>,
 *   isLoading: boolean,
 *   error: Error | undefined,
 *   refresh: () => Promise<any>,
 *   mutate: import("swr").KeyedMutator<any>
 * }}
 */
export default function useAgentSQLConnections() {
  const { data, error, isLoading, mutate } = useSWR(
    AGENT_SQL_CONNECTIONS_KEY,
    async () => {
      const res = await Admin.systemPreferencesByFields([
        "agent_sql_connections",
      ]);
      return res?.settings?.agent_sql_connections ?? [];
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    },
  );

  return {
    connections: data ?? [],
    isLoading,
    error,
    refresh: mutate,
    mutate,
  };
}
