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
import useAgentSearchProvider, {
  AGENT_SEARCH_PROVIDER_KEY,
} from "./useAgentSearchProvider";

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useAgentSearchProvider", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns default provider while loading", () => {
    Admin.systemPreferencesByFields.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useAgentSearchProvider(), { wrapper });
    expect(result.current.provider).toBe("duckduckgo-engine");
    expect(result.current.isLoading).toBe(true);
  });

  it("returns the configured provider", async () => {
    Admin.systemPreferencesByFields.mockResolvedValue({
      settings: { agent_search_provider: "serpapi" },
    });
    const { result } = renderHook(() => useAgentSearchProvider(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.provider).toBe("serpapi");
  });

  it("falls back to duckduckgo-engine on missing setting", async () => {
    Admin.systemPreferencesByFields.mockResolvedValue({ settings: {} });
    const { result } = renderHook(() => useAgentSearchProvider(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.provider).toBe("duckduckgo-engine");
  });

  it("exposes a stable cache key", () => {
    expect(AGENT_SEARCH_PROVIDER_KEY).toBe("agent-search-provider");
  });
});
