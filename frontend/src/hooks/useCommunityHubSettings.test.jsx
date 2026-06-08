// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

vi.mock("@/models/communityHub", () => ({
  default: {
    getSettings: vi.fn(),
  },
}));

import CommunityHub from "@/models/communityHub";
import useCommunityHubSettings, { COMMUNITY_HUB_SETTINGS_KEY } from "./useCommunityHubSettings";

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useCommunityHubSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns default value while loading", () => {
    CommunityHub.getSettings.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useCommunityHubSettings(), { wrapper });
    expect(result.current.settings).toEqual({ connectionKey: null });
    expect(result.current.isLoading).toBe(true);
  });

  it("returns data on success", async () => {
    const fakeSettings = { connectionKey: "abc123" };
    CommunityHub.getSettings.mockResolvedValue(fakeSettings);
    const { result } = renderHook(() => useCommunityHubSettings(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.settings).toEqual(fakeSettings);
  });

  it("captures errors", async () => {
    CommunityHub.getSettings.mockRejectedValue(new Error("fail"));
    const { result } = renderHook(() => useCommunityHubSettings(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeTruthy();
  });

  it("exposes a stable cache key", () => {
    expect(COMMUNITY_HUB_SETTINGS_KEY).toBe("community-hub/settings");
  });
});
