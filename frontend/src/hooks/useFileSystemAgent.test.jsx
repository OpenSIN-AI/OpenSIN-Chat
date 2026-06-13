// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

vi.mock("@/models/admin", () => ({
  default: { systemPreferencesByFields: vi.fn() },
}));

import Admin from "@/models/admin";
import useFileSystemAgent, { FILE_SYSTEM_AGENT_KEY } from "./useFileSystemAgent";

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useFileSystemAgent", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches disabled skills", async () => {
    Admin.systemPreferencesByFields.mockResolvedValue({
      settings: { disabled_filesystem_skills: ["skill-b"] },
    });
    const { result } = renderHook(() => useFileSystemAgent(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.disabledSkills).toEqual(["skill-b"]);
  });

  it("uses a stable cache key", () => {
    expect(FILE_SYSTEM_AGENT_KEY).toBe("file-system-agent");
  });
});
