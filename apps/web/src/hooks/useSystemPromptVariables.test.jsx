// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

vi.mock("@/models/systemPromptVariable", () => ({
  default: {
    getAll: vi.fn(),
  },
}));

import SystemPromptVariable from "@/models/systemPromptVariable";
import useSystemPromptVariables, {
  SYSTEM_PROMPT_VARIABLES_KEY,
} from "./useSystemPromptVariables";

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useSystemPromptVariables", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns empty variables while loading", () => {
    SystemPromptVariable.getAll.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useSystemPromptVariables(), {
      wrapper,
    });
    expect(result.current.variables).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  it("returns variables list", async () => {
    const fakeVars = [{ id: 1, key: "org_name", value: "Acme" }];
    SystemPromptVariable.getAll.mockResolvedValue({ variables: fakeVars });
    const { result } = renderHook(() => useSystemPromptVariables(), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.variables).toEqual(fakeVars);
  });

  it("exposes a stable cache key", () => {
    expect(SYSTEM_PROMPT_VARIABLES_KEY).toBe("system/prompt-variables");
  });
});
