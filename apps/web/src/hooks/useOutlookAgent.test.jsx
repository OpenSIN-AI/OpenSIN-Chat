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
    keys: vi.fn(),
  },
}));

vi.mock("@/models/outlookAgent", () => ({
  default: {
    getStatus: vi.fn(),
  },
}));

import Admin from "@/models/admin";
import System from "@/models/system";
import OutlookAgent from "@/models/outlookAgent";
import useOutlookAgent, { OUTLOOK_AGENT_KEY } from "./useOutlookAgent";

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useOutlookAgent", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns defaults while loading", () => {
    Admin.systemPreferencesByFields.mockReturnValue(new Promise(() => {}));
    System.keys.mockReturnValue(new Promise(() => {}));
    OutlookAgent.getStatus.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useOutlookAgent(), { wrapper });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.disabledSkills).toEqual([]);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("returns outlook agent data when fetch resolves", async () => {
    Admin.systemPreferencesByFields.mockResolvedValue({
      settings: { disabled_outlook_skills: ["send-mail"] },
    });
    System.keys.mockResolvedValue({ MultiUserMode: true });
    OutlookAgent.getStatus.mockResolvedValue({
      success: true,
      isAuthenticated: true,
      config: { clientId: "abc", tenantId: "def", clientSecret: "ghi" },
    });

    const { result } = renderHook(() => useOutlookAgent(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.disabledSkills).toEqual(["send-mail"]);
    expect(result.current.isMultiUserMode).toBe(true);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.config).toEqual({
      clientId: "abc",
      tenantId: "def",
      clientSecret: "ghi",
    });
  });

  it("exposes a stable cache key", () => {
    expect(OUTLOOK_AGENT_KEY).toBe("outlook-agent");
  });
});
