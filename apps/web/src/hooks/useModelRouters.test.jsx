// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

vi.mock("@/models/modelRouter", () => ({
  default: { getAll: vi.fn() },
}));

import ModelRouter from "@/models/modelRouter";
import useModelRouters, { MODEL_ROUTERS_KEY } from "./useModelRouters";

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useModelRouters", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches routers", async () => {
    const fixture = [{ id: 1 }];
    ModelRouter.getAll.mockResolvedValue(fixture);
    const { result } = renderHook(() => useModelRouters(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.routers).toEqual(fixture);
  });

  it("uses a stable cache key", () => {
    expect(MODEL_ROUTERS_KEY).toBe("model-routers/all");
  });
});
