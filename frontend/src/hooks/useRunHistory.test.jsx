// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

vi.mock("@/models/scheduledJobs", () => ({
  default: {
    runs: vi.fn(),
  },
}));

import ScheduledJobs from "@/models/scheduledJobs";
import useRunHistory, { RUN_HISTORY_KEY } from "./useRunHistory";

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useRunHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns default value while loading", () => {
    ScheduledJobs.runs.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useRunHistory("1"), { wrapper });
    expect(result.current.runs).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  it("returns data on success", async () => {
    const fakeData = { runs: [{ id: "r1", status: "completed" }] };
    ScheduledJobs.runs.mockResolvedValue(fakeData);
    const { result } = renderHook(() => useRunHistory("1"), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.runs).toEqual([{ id: "r1", status: "completed" }]);
  });

  it("skips fetch when id is null", () => {
    const { result } = renderHook(() => useRunHistory(null), { wrapper });
    expect(ScheduledJobs.runs).not.toHaveBeenCalled();
    expect(result.current.runs).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it("captures errors", async () => {
    ScheduledJobs.runs.mockRejectedValue(new Error("fail"));
    const { result } = renderHook(() => useRunHistory("1"), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeTruthy();
  });

  it("exposes a stable cache key", () => {
    expect(RUN_HISTORY_KEY).toBe("run-history");
  });
});
