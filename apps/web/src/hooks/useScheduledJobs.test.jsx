// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

vi.mock("@/models/scheduledJobs", () => ({
  default: {
    list: vi.fn(),
  },
}));

import ScheduledJobs from "@/models/scheduledJobs";
import useScheduledJobs, { SCHEDULED_JOBS_KEY } from "./useScheduledJobs";

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useScheduledJobs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns default value while loading", () => {
    ScheduledJobs.list.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useScheduledJobs(), { wrapper });
    expect(result.current.jobs).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  it("returns data on success", async () => {
    const fakeData = { jobs: [{ id: "1", name: "Test Job" }] };
    ScheduledJobs.list.mockResolvedValue(fakeData);
    const { result } = renderHook(() => useScheduledJobs(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.jobs).toEqual([{ id: "1", name: "Test Job" }]);
  });

  it("captures errors", async () => {
    ScheduledJobs.list.mockRejectedValue(new Error("fail"));
    const { result } = renderHook(() => useScheduledJobs(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeTruthy();
  });

  it("exposes a stable cache key", () => {
    expect(SCHEDULED_JOBS_KEY).toBe("scheduled-jobs");
  });
});
