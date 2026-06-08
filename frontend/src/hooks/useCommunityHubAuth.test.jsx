import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

vi.mock("@/models/communityHub", () => ({
  default: {
    getSettings: vi.fn(),
  },
}));

import CommunityHub from "@/models/communityHub";
import useCommunityHubAuth, {
  COMMUNITY_HUB_AUTH_KEY,
} from "./useCommunityHubAuth";

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useCommunityHubAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns not authenticated while loading", () => {
    CommunityHub.getSettings.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useCommunityHubAuth(), { wrapper });
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.loading).toBe(true);
  });

  it("returns authenticated when connectionKey is present", async () => {
    CommunityHub.getSettings.mockResolvedValue({
      connectionKey: "abc-123",
      error: null,
    });
    const { result } = renderHook(() => useCommunityHubAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isAuthenticated).toBe(true);
  });

  it("returns not authenticated when connectionKey is null", async () => {
    CommunityHub.getSettings.mockResolvedValue({
      connectionKey: null,
      error: null,
    });
    const { result } = renderHook(() => useCommunityHubAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("exposes the community-hub settings cache key", () => {
    expect(COMMUNITY_HUB_AUTH_KEY).toBe("community-hub/settings");
  });
});
