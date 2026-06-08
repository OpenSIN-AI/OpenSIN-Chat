// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

vi.mock("@/utils/piperTTS", () => ({
  default: { voices: vi.fn() },
}));

import PiperTTSClient from "@/utils/piperTTS";
import usePiperVoices, { CACHE_KEY } from "./usePiperVoices";

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("usePiperVoices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns voices from SWR data", async () => {
    PiperTTSClient.voices.mockResolvedValue([
      { key: "en_US-hfc_female-medium" },
    ]);

    const { result } = renderHook(() => usePiperVoices(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.voices).toEqual([{ key: "en_US-hfc_female-medium" }]);
  });

  it("exports CACHE_KEY", () => {
    expect(CACHE_KEY).toBe("piper_voices");
  });
});
