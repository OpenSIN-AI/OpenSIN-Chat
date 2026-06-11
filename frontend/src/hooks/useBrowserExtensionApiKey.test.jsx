// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

vi.mock("@/models/browserExtensionApiKey", () => ({
  default: {
    getAll: vi.fn(),
  },
}));

import BrowserExtensionApiKey from "@/models/browserExtensionApiKey";
import useBrowserExtensionApiKey, {
  BROWSER_EXTENSION_API_KEY_KEY,
} from "./useBrowserExtensionApiKey";

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useBrowserExtensionApiKey", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns empty defaults while loading", () => {
    BrowserExtensionApiKey.getAll.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useBrowserExtensionApiKey(), {
      wrapper,
    });
    expect(result.current.apiKeys).toEqual([]);
    expect(result.current.isMultiUser).toBe(false);
    expect(result.current.isLoading).toBe(true);
  });

  it("returns apiKeys and isMultiUser", async () => {
    BrowserExtensionApiKey.getAll.mockResolvedValue({
      success: true,
      apiKeys: [
        { id: 1, key: "k1", user: null },
        { id: 2, key: "k2", user: { id: 1 } },
      ],
    });
    const { result } = renderHook(() => useBrowserExtensionApiKey(), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.apiKeys).toHaveLength(2);
    expect(result.current.isMultiUser).toBe(true);
  });

  it("detects error from API", async () => {
    BrowserExtensionApiKey.getAll.mockResolvedValue({
      success: false,
      error: "Unauthorized",
      apiKeys: [],
    });
    const { result } = renderHook(() => useBrowserExtensionApiKey(), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe("Unauthorized");
  });

  it("exposes a stable cache key", () => {
    expect(BROWSER_EXTENSION_API_KEY_KEY).toBe("browser-extension/api-keys");
  });
});
