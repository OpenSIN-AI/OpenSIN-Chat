// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

vi.mock("@/models/mcpServers", () => ({
  default: {
    listServers: vi.fn(),
  },
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

  it("returns empty servers while loading", () => {
    MCPServers.listServers.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useMCPServers(), { wrapper });
    expect(result.current.servers).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  it("returns the servers list", async () => {
    MCPServers.listServers.mockResolvedValue({
      servers: [{ name: "test-server", running: true, tools: [] }],
    });
    const { result } = renderHook(() => useMCPServers(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.servers).toEqual([
      { name: "test-server", running: true, tools: [] },
    ]);
  });

  it("exposes a stable cache key", () => {
    expect(MCP_SERVERS_KEY).toBe("mcp-servers/list");
  });
});
