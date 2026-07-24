// SPDX-License-Identifier: MIT
import useSWR from "swr";
import MCPServers from "@/models/mcpServers";

export const MCP_SERVERS_KEY = "mcp-servers/list";

export default function useMCPServers() {
  const { data, error, isLoading, mutate } = useSWR(MCP_SERVERS_KEY, () =>
    MCPServers.listServers(),
  );

  return {
    servers: data?.servers ?? [],
    isLoading,
    error,
    refresh: mutate,
    mutate,
  };
}
