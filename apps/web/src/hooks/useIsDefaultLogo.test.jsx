// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

vi.mock("@/models/system", () => ({
  default: {
    isDefaultLogo: vi.fn(),
  },
}));

import System from "@/models/system";
import useIsDefaultLogo, { IS_DEFAULT_LOGO_KEY } from "./useIsDefaultLogo";

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useIsDefaultLogo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when logo is default", async () => {
    System.isDefaultLogo.mockResolvedValue(true);

    const { result } = renderHook(() => useIsDefaultLogo(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isDefaultLogo).toBe(true);
  });

  it("returns false when logo is custom", async () => {
    System.isDefaultLogo.mockResolvedValue(false);

    const { result } = renderHook(() => useIsDefaultLogo(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isDefaultLogo).toBe(false);
  });

  it("uses a stable cache key", () => {
    expect(IS_DEFAULT_LOGO_KEY).toBe("system/is-default-logo");
  });
});
