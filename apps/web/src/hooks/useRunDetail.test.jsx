// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

vi.mock("@/models/scheduledJobs", () => ({
  default: {
    getRun: vi.fn(),
  },
}));

import ScheduledJobs from "@/models/scheduledJobs";
import useRunDetail, { RUN_DETAIL_KEY } from "./useRunDetail";

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useRunDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns default values while loading", () => {
    ScheduledJobs.getRun.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useRunDetail("r1"), { wrapper });
    expect(result.current.run).toBeNull();
    expect(result.current.job).toBeNull();
    expect(result.current.isLoading).toBe(true);
  });

  it("returns data on success", async () => {
    const fakeData = {
      run: { id: "r1", status: "completed" },
      job: { id: "1", name: "Test" },
    };
    ScheduledJobs.getRun.mockResolvedValue(fakeData);
    const { result } = renderHook(() => useRunDetail("r1"), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.run).toEqual({ id: "r1", status: "completed" });
    expect(result.current.job).toEqual({ id: "1", name: "Test" });
  });

  it("skips fetch when runId is null", () => {
    const { result } = renderHook(() => useRunDetail(null), { wrapper });
    expect(ScheduledJobs.getRun).not.toHaveBeenCalled();
    expect(result.current.run).toBeNull();
    expect(result.current.job).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("captures errors", async () => {
    ScheduledJobs.getRun.mockRejectedValue(new Error("fail"));
    const { result } = renderHook(() => useRunDetail("r1"), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeTruthy();
  });

  it("exposes a stable cache key", () => {
    expect(RUN_DETAIL_KEY).toBe("run-detail");
  });
});
