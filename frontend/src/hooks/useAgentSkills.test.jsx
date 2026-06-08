// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

vi.mock("@/models/admin", () => ({
  default: {
    systemPreferencesByFields: vi.fn(),
  },
}));

vi.mock("@/models/system", () => ({
  default: {
    isFileSystemAgentAvailable: vi.fn(),
    isMultiUserMode: vi.fn(),
  },
}));

vi.mock("@/models/agentFlows", () => ({
  default: {
    listFlows: vi.fn(),
  },
}));

import Admin from "@/models/admin";
import System from "@/models/system";
import AgentFlows from "@/models/agentFlows";
import useAgentSkills, { AGENT_SKILLS_KEY } from "./useAgentSkills";

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useAgentSkills", () => {
  beforeEach(() => vi.clearAllMocks());

  it("starts in loading state", () => {
    Admin.systemPreferencesByFields.mockResolvedValue({ settings: {} });
    AgentFlows.listFlows.mockResolvedValue({ flows: [] });
    System.isFileSystemAgentAvailable.mockResolvedValue(false);
    System.isMultiUserMode.mockResolvedValue(false);

    const { result } = renderHook(() => useAgentSkills(), { wrapper });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.disabledDefaults).toEqual([]);
  });

  it("returns skills data when fetch resolves", async () => {
    Admin.systemPreferencesByFields.mockResolvedValue({
      settings: {
        disabled_agent_skills: ["web-search"],
        default_agent_skills: ["sql-connector"],
        imported_agent_skills: [],
      },
    });
    AgentFlows.listFlows.mockResolvedValue({
      flows: [{ uuid: "1", name: "flow-1", active: false }],
    });
    System.isFileSystemAgentAvailable.mockResolvedValue(true);
    System.isMultiUserMode.mockResolvedValue(true);

    const { result } = renderHook(() => useAgentSkills(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.disabledDefaults).toEqual(["web-search"]);
    expect(result.current.enabledConfigurable).toEqual(["sql-connector"]);
    expect(result.current.importedSkills).toEqual([]);
    expect(result.current.flows).toEqual([
      { uuid: "1", name: "flow-1", active: false },
    ]);
    expect(result.current.fileSystemAgentAvailable).toBe(true);
    expect(result.current.isMultiUser).toBe(true);
  });

  it("exposes a stable cache key", () => {
    expect(AGENT_SKILLS_KEY).toBe("agent-skills");
  });
});
