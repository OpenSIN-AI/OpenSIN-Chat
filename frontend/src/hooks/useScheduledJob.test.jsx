// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

vi.mock("@/models/scheduledJobs", () => ({
  default: {
    get: vi.fn(),
  },
}));

import ScheduledJobs from "@/models/scheduledJobs";
import useScheduledJob, { SCHEDULED_JOB_KEY } from "./useScheduledJob";

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useScheduledJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns default value while loading", () => {
    ScheduledJobs.get.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useScheduledJob("1"), { wrapper });
    expect(result.current.job).toBeNull();
    expect(result.current.isLoading).toBe(true);
  });

  it("returns data on success", async () => {
    const fakeData = { job: { id: "1", name: "Test Job" } };
    ScheduledJobs.get.mockResolvedValue(fakeData);
    const { result } = renderHook(() => useScheduledJob("1"), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.job).toEqual({ id: "1", name: "Test Job" });
  });

  it("skips fetch when id is null", () => {
    const { result } = renderHook(() => useScheduledJob(null), { wrapper });
    expect(ScheduledJobs.get).not.toHaveBeenCalled();
    expect(result.current.job).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("captures errors", async () => {
    ScheduledJobs.get.mockRejectedValue(new Error("fail"));
    const { result } = renderHook(() => useScheduledJob("1"), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeTruthy();
  });

  it("exposes a stable cache key", () => {
    expect(SCHEDULED_JOB_KEY).toBe("scheduled-job");
  });
});
