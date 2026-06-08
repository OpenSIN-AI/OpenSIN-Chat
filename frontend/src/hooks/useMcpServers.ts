// SPDX-License-Identifier: MIT
import { useEffect } from "react";
import useSWR from "swr";
import MCPServers from "@/models/mcpServers";

/**
 * SWR cache key for the user's configured MCP servers list.
 *
 * @type {string}
 */
export const mcpServersKey = "mcp-servers";

/**
 * Fetches the configured MCP (Model Context Protocol) servers with
 * caching and revalidation. Replaces the
 * `useEffect(() => { MCPServers.listServers().then(setServers) }, [])` pattern
 * in the MCP configuration UI.
 *
 * @returns {{
 *   servers: Array<object>,
 *   isLoading: boolean,
 *   error: Error | undefined,
 *   refresh: () => Promise<any>,
 *   mutate: import("swr").KeyedMutator<any>
 * }}
 */
export default function useMcpServers() {
  const { data, error, isLoading, mutate } = useSWR(
    mcpServersKey,
    async () => {
      const result = await MCPServers.listServers();
      return result?.servers || [];
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    },
  );

  return {
    servers: data || [],
    isLoading,
    error,
    refresh: mutate,
    mutate,
  };
}
