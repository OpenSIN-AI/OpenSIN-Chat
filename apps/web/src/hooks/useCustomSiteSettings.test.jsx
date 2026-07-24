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
import useCustomSiteSettings, {
  CUSTOM_SITE_SETTINGS_KEY,
} from "./useCustomSiteSettings";

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useCustomSiteSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exports the SWR cache key", () => {
    expect(CUSTOM_SITE_SETTINGS_KEY).toBe("admin/custom-site-settings");
  });

  it("returns null title and faviconUrl while loading", () => {
    Admin.systemPreferencesByFields.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useCustomSiteSettings(), { wrapper });
    expect(result.current.title).toBeNull();
    expect(result.current.faviconUrl).toBeNull();
    expect(result.current.isLoading).toBe(true);
  });

  it("fetches and returns custom title and favicon", async () => {
    Admin.systemPreferencesByFields.mockResolvedValue({
      settings: {
        meta_page_title: "My Custom Title",
        meta_page_favicon: "https://example.com/favicon.ico",
      },
    });

    const { result } = renderHook(() => useCustomSiteSettings(), { wrapper });

    await waitFor(() => {
      expect(result.current.title).toBe("My Custom Title");
      expect(result.current.faviconUrl).toBe("https://example.com/favicon.ico");
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("returns null when settings fields are absent", async () => {
    Admin.systemPreferencesByFields.mockResolvedValue({
      settings: {},
    });

    const { result } = renderHook(() => useCustomSiteSettings(), { wrapper });

    await waitFor(() => {
      expect(result.current.title).toBeNull();
      expect(result.current.faviconUrl).toBeNull();
    });
  });

  it("returns null when settings is null", async () => {
    Admin.systemPreferencesByFields.mockResolvedValue({ settings: null });

    const { result } = renderHook(() => useCustomSiteSettings(), { wrapper });

    await waitFor(() => {
      expect(result.current.title).toBeNull();
      expect(result.current.faviconUrl).toBeNull();
    });
  });

  it("exposes error on fetch failure", async () => {
    Admin.systemPreferencesByFields.mockRejectedValue(
      new Error("Network error"),
    );

    const { result } = renderHook(() => useCustomSiteSettings(), { wrapper });

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error.message).toBe("Network error");
    });
  });

  it("exposes a refresh (mutate) function", async () => {
    Admin.systemPreferencesByFields.mockResolvedValue({
      settings: { meta_page_title: "T1", meta_page_favicon: null },
    });

    const { result } = renderHook(() => useCustomSiteSettings(), { wrapper });

    await waitFor(() => {
      expect(result.current.title).toBe("T1");
    });

    expect(typeof result.current.refresh).toBe("function");
  });

  it("requests the correct fields from Admin", async () => {
    Admin.systemPreferencesByFields.mockResolvedValue({ settings: {} });

    renderHook(() => useCustomSiteSettings(), { wrapper });

    await waitFor(() => {
      expect(Admin.systemPreferencesByFields).toHaveBeenCalledWith([
        "meta_page_title",
        "meta_page_favicon",
      ]);
    });
  });
});
