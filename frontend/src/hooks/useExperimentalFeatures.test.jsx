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
import useExperimentalFeatures, {
  EXPERIMENTAL_FEATURES_KEY,
} from "./useExperimentalFeatures";

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useExperimentalFeatures", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns empty feature flags while loading", () => {
    Admin.systemPreferencesByFields.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useExperimentalFeatures(), { wrapper });
    expect(result.current.featureFlags).toEqual({});
    expect(result.current.isLoading).toBe(true);
  });

  it("returns feature flags from settings", async () => {
    Admin.systemPreferencesByFields.mockResolvedValue({
      settings: {
        feature_flags: { experimental_live_file_sync: true },
      },
    });
    const { result } = renderHook(() => useExperimentalFeatures(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.featureFlags.experimental_live_file_sync).toBe(true);
  });

  it("exposes a stable cache key", () => {
    expect(EXPERIMENTAL_FEATURES_KEY).toBe("admin/experimental-features");
  });
});
