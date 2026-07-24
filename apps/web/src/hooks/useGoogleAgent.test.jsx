// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

vi.mock("@/models/admin", () => ({
  default: { systemPreferencesByFields: vi.fn() },
}));
vi.mock("@/models/system", () => ({
  default: { keys: vi.fn() },
}));
vi.mock("@/models/googleAgentSkills", () => ({
  default: {
    gmail: { getStatus: vi.fn() },
    calendar: { getStatus: vi.fn() },
  },
}));

import Admin from "@/models/admin";
import System from "@/models/system";
import GoogleAgentSkills from "@/models/googleAgentSkills";
import {
  useGmailAgent,
  useGoogleCalendarAgent,
  GMAIL_AGENT_KEY,
  GOOGLE_CALENDAR_AGENT_KEY,
} from "./useGoogleAgent";

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useGoogleAgent", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches Gmail agent config", async () => {
    Admin.systemPreferencesByFields.mockResolvedValue({
      settings: { disabled_gmail_skills: ["skill"] },
    });
    System.keys.mockResolvedValue({ MultiUserMode: true });
    GoogleAgentSkills.gmail.getStatus.mockResolvedValue({
      success: true,
      config: { id: 1 },
    });

    const { result } = renderHook(() => useGmailAgent(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.disabledSkills).toEqual(["skill"]);
    expect(result.current.isMultiUserMode).toBe(true);
    expect(result.current.config).toEqual({ id: 1 });
  });

  it("fetches Google Calendar agent config", async () => {
    Admin.systemPreferencesByFields.mockResolvedValue({
      settings: { disabled_google_calendar_skills: [] },
    });
    System.keys.mockResolvedValue({ MultiUserMode: false });
    GoogleAgentSkills.calendar.getStatus.mockResolvedValue({
      success: false,
    });

    const { result } = renderHook(() => useGoogleCalendarAgent(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isMultiUserMode).toBe(false);
    expect(result.current.config).toBeNull();
  });

  it("uses stable cache keys", () => {
    expect(GMAIL_AGENT_KEY).toBe("gmail-agent");
    expect(GOOGLE_CALENDAR_AGENT_KEY).toBe("google-calendar-agent");
  });
});
