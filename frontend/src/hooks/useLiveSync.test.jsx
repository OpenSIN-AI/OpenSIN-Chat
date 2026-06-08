// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

vi.mock("@/models/experimental/liveSync", () => ({
  default: {
    queues: vi.fn(),
  },
}));

import LiveDocumentSync from "@/models/experimental/liveSync";
import useLiveSync, { LIVE_SYNC_QUEUES_KEY } from "./useLiveSync";

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useLiveSync", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns empty queues while loading", () => {
    LiveDocumentSync.queues.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useLiveSync(), { wrapper });
    expect(result.current.queues).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  it("returns the queues list", async () => {
    const fakeQueues = [{ id: 1, documentName: "doc1" }];
    LiveDocumentSync.queues.mockResolvedValue(fakeQueues);
    const { result } = renderHook(() => useLiveSync(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.queues).toEqual(fakeQueues);
  });

  it("exposes a stable cache key", () => {
    expect(LIVE_SYNC_QUEUES_KEY).toBe("experimental/live-sync/queues");
  });
});
