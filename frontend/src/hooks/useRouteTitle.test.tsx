// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

vi.mock("react-router", () => ({
  useLocation: vi.fn(),
}));

vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

import { useLocation } from "react-router";
import useRouteTitle from "./useRouteTitle";

describe("useRouteTitle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.title = "";
  });

  it("sets title to app name for home route", () => {
    (useLocation as any).mockReturnValue({ pathname: "/" });
    renderHook(() => useRouteTitle());
    expect(document.title).toBe("OpenSIN Chat");
  });

  it("sets title for login route", () => {
    (useLocation as any).mockReturnValue({ pathname: "/login" });
    renderHook(() => useRouteTitle());
    expect(document.title).toBe("Login — OpenSIN Chat");
  });

  it("sets title for SSO route", () => {
    (useLocation as any).mockReturnValue({ pathname: "/sso/callback" });
    renderHook(() => useRouteTitle());
    expect(document.title).toBe("SSO Login — OpenSIN Chat");
  });

  it("sets title for onboarding route", () => {
    (useLocation as any).mockReturnValue({ pathname: "/onboarding" });
    renderHook(() => useRouteTitle());
    expect(document.title).toBe("Setup — OpenSIN Chat");
  });

  it("does not set title for docs sub-route (managed by Docs page)", () => {
    (useLocation as any).mockReturnValue({ pathname: "/docs/api" });
    renderHook(() => useRouteTitle());
    expect(document.title).toBe("");
  });

  it("sets title for pdf-analysis route", () => {
    (useLocation as any).mockReturnValue({ pathname: "/pdf-analysis" });
    renderHook(() => useRouteTitle());
    expect(document.title).toBe("PDF Analysis — OpenSIN Chat");
  });

  it("sets title for workspace route", () => {
    (useLocation as any).mockReturnValue({ pathname: "/workspace/my-ws" });
    renderHook(() => useRouteTitle());
    expect(document.title).toBe("Workspace — OpenSIN Chat");
  });

  it("sets title for workspace settings route", () => {
    (useLocation as any).mockReturnValue({
      pathname: "/workspace/my-ws/settings/llm",
    });
    renderHook(() => useRouteTitle());
    expect(document.title).toBe("Workspace Settings — OpenSIN Chat");
  });

  it("sets title for settings route", () => {
    (useLocation as any).mockReturnValue({ pathname: "/settings/system" });
    renderHook(() => useRouteTitle());
    expect(document.title).toBe("Settings — OpenSIN Chat");
  });

  it("sets title for unknown route (not found)", () => {
    (useLocation as any).mockReturnValue({ pathname: "/random-page" });
    renderHook(() => useRouteTitle());
    expect(document.title).toBe("Page Not Found — OpenSIN Chat");
  });

  it("updates title when pathname changes", () => {
    (useLocation as any).mockReturnValue({ pathname: "/" });
    const { rerender } = renderHook(() => useRouteTitle());
    expect(document.title).toBe("OpenSIN Chat");

    (useLocation as any).mockReturnValue({ pathname: "/settings/system" });
    rerender();
    expect(document.title).toBe("Settings — OpenSIN Chat");
  });
});
