// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

vi.mock("@/models/providerStatus", () => ({
  default: { status: vi.fn() },
}));

import ProviderStatus from "@/models/providerStatus";
import useProviderKeyStatus from "./useProviderKeyStatus";

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useProviderKeyStatus", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches provider status with defaults", async () => {
    ProviderStatus.status.mockResolvedValue({
      providers: [{ name: "openai" }],
      paths: { storageDirSet: true },
      checkedAt: "now",
    });
    const { result } = renderHook(() => useProviderKeyStatus(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.providers).toEqual([{ name: "openai" }]);
    expect(result.current.paths).toEqual({ storageDirSet: true });
    expect(result.current.checkedAt).toBe("now");
  });

  it("returns error from thrown status", async () => {
    ProviderStatus.status.mockRejectedValue(new Error("Network"));
    const { result } = renderHook(() => useProviderKeyStatus(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe("Network");
  });
});
