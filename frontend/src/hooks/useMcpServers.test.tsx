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
import useMcpServers, { mcpServersKey } from "./useMcpServers";

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useMcpServers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an empty list while loading", () => {
    MCPServers.listServers.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useMcpServers(), { wrapper });
    expect(result.current.servers).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  it("returns the server list on success", async () => {
    const fakeServers = [
      { id: 1, name: "github", url: "https://api.github.com" },
      { id: 2, name: "slack", url: "https://slack.com/api" },
    ];
    MCPServers.listServers.mockResolvedValue({ success: true, servers: fakeServers });

    const { result } = renderHook(() => useMcpServers(), { wrapper });
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.servers).toEqual(fakeServers);
  });

  it("handles a failed list response gracefully (empty list)", async () => {
    MCPServers.listServers.mockResolvedValue({ success: false, servers: [] });

    const { result } = renderHook(() => useMcpServers(), { wrapper });
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.servers).toEqual([]);
  });

  it("exposes a stable cache key", () => {
    expect(mcpServersKey).toBe("mcp-servers");
  });
});
