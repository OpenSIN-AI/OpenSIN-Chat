// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

vi.mock("@/models/system", () => ({
  default: {
    fetchDefaultSystemPrompt: vi.fn(),
  },
}));

import System from "@/models/system";
import useDefaultSystemPrompt, {
  DEFAULT_SYSTEM_PROMPT_KEY,
} from "./useDefaultSystemPrompt";

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useDefaultSystemPrompt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the default system prompt", async () => {
    System.fetchDefaultSystemPrompt.mockResolvedValue({
      defaultSystemPrompt: "You are a helpful assistant.",
      saneDefaultSystemPrompt: "Hello",
    });

    const { result } = renderHook(() => useDefaultSystemPrompt(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.defaultSystemPrompt).toBe(
      "You are a helpful assistant.",
    );
  });

  it("returns empty string on failure", async () => {
    System.fetchDefaultSystemPrompt.mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useDefaultSystemPrompt(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.defaultSystemPrompt).toBe("");
  });

  it("uses a stable cache key", () => {
    expect(DEFAULT_SYSTEM_PROMPT_KEY).toBe("system/default-system-prompt");
  });
});
