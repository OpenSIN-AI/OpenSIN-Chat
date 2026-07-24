// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

vi.mock("@/models/system", () => ({
  default: {
    keys: vi.fn(),
    isFileSystemAgentAvailable: vi.fn(),
    isCreateFilesAgentAvailable: vi.fn(),
    updateSystem: vi.fn(),
  },
}));
vi.mock("@/models/admin", () => ({
  default: {
    systemPreferencesByFields: vi.fn(),
    updateSystemPreferences: vi.fn(),
  },
}));
vi.mock("@/models/agentFlows", () => ({
  default: { listFlows: vi.fn() },
}));
vi.mock("@/utils/toast", () => ({
  default: vi.fn(),
}));

import System from "@/models/system";
import Admin from "@/models/admin";
import AgentFlows from "@/models/agentFlows";
import showToast from "@/utils/toast";
import { useAgentForm } from "./useAgentForm";

describe("useAgentForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(System.keys).mockResolvedValue({ MultiUserMode: false });
    vi.mocked(Admin.systemPreferencesByFields).mockResolvedValue({
      settings: {
        default_agent_skills: ["web-search"],
        disabled_agent_skills: [],
        imported_agent_skills: [],
        active_agent_flows: [],
      },
      error: "",
    });
    vi.mocked(AgentFlows.listFlows).mockResolvedValue({
      flows: [{ uuid: "1", active: true }],
    });
    vi.mocked(System.isFileSystemAgentAvailable).mockResolvedValue(false);
    vi.mocked(System.isCreateFilesAgentAvailable).mockResolvedValue(false);
  });

  it("loads initial settings", async () => {
    const { result } = renderHook(() => useAgentForm());
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.settings).toMatchObject({ MultiUserMode: false });
    expect(result.current.agentSkills).toEqual(["web-search"]);
  });

  it("toggles default skills and agent skills", async () => {
    const { result } = renderHook(() => useAgentForm());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.toggleDefaultSkill("web-search"));
    expect(result.current.disabledAgentSkills).toContain("web-search");
    expect(result.current.hasChanges).toBe(true);

    act(() => result.current.toggleAgentSkill("web-search"));
    expect(result.current.agentSkills).not.toContain("web-search");
  });

  it("toggles flows and MCP servers", async () => {
    const { result } = renderHook(() => useAgentForm());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.toggleFlow("1"));
    expect(result.current.activeFlowIds).not.toContain("1");

    act(() =>
      result.current.setMcpServers([{ name: "server", running: false }]),
    );
    act(() => result.current.toggleMCP("server"));
    expect(result.current.mcpServers[0].running).toBe(true);
  });

  it("submits the form and reloads settings", async () => {
    const { result } = renderHook(() => useAgentForm());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const form = document.createElement("form");
    const input = document.createElement("input");
    input.name = "openAiTemp";
    input.value = "0.7";
    form.appendChild(input);
    result.current.formEl.current = form;

    vi.mocked(Admin.updateSystemPreferences).mockResolvedValue({
      success: true,
      error: "",
    } as any);
    vi.mocked(System.updateSystem).mockResolvedValue({
      success: true,
      error: "",
    } as any);

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as any);
    });

    expect(Admin.updateSystemPreferences).toHaveBeenCalled();
    expect(System.updateSystem).toHaveBeenCalled();
    expect(showToast).toHaveBeenCalled();
    expect(result.current.hasChanges).toBe(false);
  });
});
