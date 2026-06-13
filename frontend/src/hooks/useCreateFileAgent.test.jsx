// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

vi.mock("@/models/admin", () => ({
  default: { systemPreferencesByFields: vi.fn() },
}));

import Admin from "@/models/admin";
import useCreateFileAgent, { CREATE_FILE_AGENT_KEY } from "./useCreateFileAgent";

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useCreateFileAgent", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches disabled skills", async () => {
    Admin.systemPreferencesByFields.mockResolvedValue({
      settings: { disabled_create_files_skills: ["skill-a"] },
    });
    const { result } = renderHook(() => useCreateFileAgent(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.disabledSkills).toEqual(["skill-a"]);
  });

  it("uses a stable cache key", () => {
    expect(CREATE_FILE_AGENT_KEY).toBe("create-file-agent");
  });
});
