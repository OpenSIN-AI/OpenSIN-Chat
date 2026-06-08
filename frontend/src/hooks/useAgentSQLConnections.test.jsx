// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

vi.mock("@/models/admin", () => ({
  default: {
    systemPreferencesByFields: vi.fn(),
  },
}));

import Admin from "@/models/admin";
import useAgentSQLConnections, {
  AGENT_SQL_CONNECTIONS_KEY,
} from "./useAgentSQLConnections";

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useAgentSQLConnections", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns empty connections while loading", () => {
    Admin.systemPreferencesByFields.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useAgentSQLConnections(), { wrapper });
    expect(result.current.connections).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  it("returns the connections list", async () => {
    const fakeConnections = [
      { database_id: "db1", engine: "postgresql" },
    ];
    Admin.systemPreferencesByFields.mockResolvedValue({
      settings: { agent_sql_connections: fakeConnections },
    });
    const { result } = renderHook(() => useAgentSQLConnections(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.connections).toEqual(fakeConnections);
  });

  it("exposes a stable cache key", () => {
    expect(AGENT_SQL_CONNECTIONS_KEY).toBe("agent-sql-connections");
  });
});
