// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

vi.mock("@/models/system", () => ({
  default: {
    eventLogs: vi.fn(),
  },
}));

import System from "@/models/system";
import useEventLogs, { EVENT_LOGS_KEY } from "./useEventLogs";

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useEventLogs", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns empty result while loading", () => {
    System.eventLogs.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useEventLogs(0), { wrapper });
    expect(result.current.result).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  it("returns event logs for given offset", async () => {
    System.eventLogs.mockResolvedValue({
      logs: [{ id: 1, type: "login" }],
      hasPages: true,
    });
    const { result } = renderHook(() => useEventLogs(0), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.result.logs).toEqual([{ id: 1, type: "login" }]);
  });

  it("exposes a stable cache key", () => {
    expect(EVENT_LOGS_KEY).toBe("system/event-logs");
  });
});
