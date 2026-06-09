// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

vi.mock("@/models/mcpServers", () => ({
  default: { listServers: vi.fn() },
}));

import MCPServers from "@/models/mcpServers";
import useMCPServers, { MCP_SERVERS_KEY } from "./useMCPServers";

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useMCPServers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches MCP servers", async () => {
    MCPServers.listServers.mockResolvedValue({
      servers: [
        { name: "server1", running: true, tools: [] },
        { name: "server2", running: false, tools: [] },
      ],
    });
    const { result } = renderHook(() => useMCPServers(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.servers).toHaveLength(2);
    expect(result.current.servers[0].name).toBe("server1");
    expect(MCPServers.listServers).toHaveBeenCalledTimes(1);
  });

  it("returns empty array when listServers returns null", async () => {
    MCPServers.listServers.mockResolvedValue({ servers: null });
    const { result } = renderHook(() => useMCPServers(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.servers).toEqual([]);
  });

  it("returns empty array on error", async () => {
    MCPServers.listServers.mockRejectedValue(new Error("Network error"));
    const { result } = renderHook(() => useMCPServers(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.servers).toEqual([]);
    expect(result.current.error).toBeTruthy();
  });

  it("uses stable cache key", () => {
    expect(MCP_SERVERS_KEY).toBe("mcp-servers/list");
  });
});
