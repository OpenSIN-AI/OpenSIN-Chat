// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

vi.mock("@/models/system", () => ({
  default: {
    keys: vi.fn(),
    isFileSystemAgentAvailable: vi.fn(),
    isCreateFilesAgentAvailable: vi.fn(),
  },
}));

vi.mock("@/models/admin", () => ({
  default: {
    systemPreferencesByFields: vi.fn(),
  },
}));

vi.mock("@/models/agentFlows", () => ({
  default: {
    listFlows: vi.fn(),
  },
}));

import System from "@/models/system";
import Admin from "@/models/admin";
import AgentFlows from "@/models/agentFlows";
import useAgentPreferences, { AGENT_PREFERENCES_KEY } from "./useAgentPreferences";

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useAgentPreferences", () => {
  beforeEach(() => vi.clearAllMocks());

  it("starts in loading state", () => {
    System.keys.mockResolvedValue({});
    Admin.systemPreferencesByFields.mockResolvedValue({ settings: {} });
    AgentFlows.listFlows.mockResolvedValue({ flows: [] });
    System.isFileSystemAgentAvailable.mockResolvedValue(false);
    System.isCreateFilesAgentAvailable.mockResolvedValue(false);

    const { result } = renderHook(() => useAgentPreferences(), { wrapper });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.agentSkills).toEqual([]);
  });

  it("returns preferences when fetch resolves", async () => {
    System.keys.mockResolvedValue({ MultiUserMode: false });
    Admin.systemPreferencesByFields.mockResolvedValue({
      settings: {
        default_agent_skills: ["web-search"],
        disabled_agent_skills: [],
        imported_agent_skills: [{ hubId: "abc" }],
      },
    });
    AgentFlows.listFlows.mockResolvedValue({
      flows: [{ uuid: "1", name: "flow-1", active: true }],
    });
    System.isFileSystemAgentAvailable.mockResolvedValue(true);
    System.isCreateFilesAgentAvailable.mockResolvedValue(false);

    const { result } = renderHook(() => useAgentPreferences(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.settings).toEqual({
      MultiUserMode: false,
      preferences: {
        default_agent_skills: ["web-search"],
        disabled_agent_skills: [],
        imported_agent_skills: [{ hubId: "abc" }],
      },
    });
    expect(result.current.agentSkills).toEqual(["web-search"]);
    expect(result.current.disabledAgentSkills).toEqual([]);
    expect(result.current.importedSkills).toEqual([{ hubId: "abc" }]);
    expect(result.current.agentFlows).toEqual([
      { uuid: "1", name: "flow-1", active: true },
    ]);
    expect(result.current.activeFlowIds).toEqual(["1"]);
    expect(result.current.fileSystemAgentAvailable).toBe(true);
    expect(result.current.createFilesAgentAvailable).toBe(false);
  });

  it("exposes a stable cache key", () => {
    expect(AGENT_PREFERENCES_KEY).toBe("agent-preferences");
  });
});
