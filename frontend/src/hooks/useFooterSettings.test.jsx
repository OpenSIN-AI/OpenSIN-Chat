// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

vi.mock("@/models/admin", () => ({
  default: {
    systemPreferencesByFields: vi.fn(),
  },
}));

import Admin from "@/models/admin";
import useFooterSettings, { FOOTER_SETTINGS_KEY } from "./useFooterSettings";

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useFooterSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns footer icons", async () => {
    Admin.systemPreferencesByFields.mockResolvedValue({
      settings: { footer_data: '[{"icon":"github","url":"https://github.com"}]' },
    });

    const { result } = renderHook(() => useFooterSettings(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.footerIcons).toHaveLength(1);
    expect(result.current.footerIcons[0].icon).toBe("github");
  });

  it("returns 3-item null array when no footer_data", async () => {
    Admin.systemPreferencesByFields.mockResolvedValue({
      settings: {},
    });

    const { result } = renderHook(() => useFooterSettings(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.footerIcons).toHaveLength(3);
    expect(result.current.footerIcons.every((i) => i === null)).toBe(true);
  });

  it("uses a stable cache key", () => {
    expect(FOOTER_SETTINGS_KEY).toBe("system/footer-settings");
  });
});
