// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

vi.mock("react-router-dom", () => ({
  useLocation: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) => {
      const map = {
        "page.titles.home": "Home",
        "page.titles.login": "Login",
        "page.titles.sso": "SSO Login",
        "page.titles.onboarding": "Onboarding",
        "page.titles.docs": "Documentation",
        "page.titles.pdfAnalysis": "PDF Analysis",
        "page.titles.workspace": "Workspace",
        "page.titles.workspaceSettings": "Workspace Settings",
        "page.titles.settings": "Settings",
        "page.titles.notFound": "Not Found",
        "page.title": "OpenSIN Chat",
      };
      return map[key] || key;
    },
    i18n: { language: "en" },
  }),
}));

import { useLocation } from "react-router-dom";
import useRouteTitle from "./useRouteTitle";

describe("useRouteTitle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.title = "";
  });

  it("sets title to app name for home route", () => {
    useLocation.mockReturnValue({ pathname: "/" });
    renderHook(() => useRouteTitle());
    expect(document.title).toBe("OpenSIN Chat");
  });

  it("sets title for login route", () => {
    useLocation.mockReturnValue({ pathname: "/login" });
    renderHook(() => useRouteTitle());
    expect(document.title).toBe("Login — OpenSIN Chat");
  });

  it("sets title for SSO route", () => {
    useLocation.mockReturnValue({ pathname: "/sso/callback" });
    renderHook(() => useRouteTitle());
    expect(document.title).toBe("SSO Login — OpenSIN Chat");
  });

  it("sets title for onboarding route", () => {
    useLocation.mockReturnValue({ pathname: "/onboarding" });
    renderHook(() => useRouteTitle());
    expect(document.title).toBe("Onboarding — OpenSIN Chat");
  });

  it("does not set title for docs sub-route (managed by Docs page)", () => {
    useLocation.mockReturnValue({ pathname: "/docs/api" });
    renderHook(() => useRouteTitle());
    expect(document.title).toBe("");
  });

  it("sets title for pdf-analysis route", () => {
    useLocation.mockReturnValue({ pathname: "/pdf-analysis" });
    renderHook(() => useRouteTitle());
    expect(document.title).toBe("PDF Analysis — OpenSIN Chat");
  });

  it("sets title for workspace route", () => {
    useLocation.mockReturnValue({ pathname: "/workspace/my-ws" });
    renderHook(() => useRouteTitle());
    expect(document.title).toBe("Workspace — OpenSIN Chat");
  });

  it("sets title for workspace settings route", () => {
    useLocation.mockReturnValue({
      pathname: "/workspace/my-ws/settings/llm",
    });
    renderHook(() => useRouteTitle());
    expect(document.title).toBe("Workspace Settings — OpenSIN Chat");
  });

  it("sets title for settings route", () => {
    useLocation.mockReturnValue({ pathname: "/settings/system" });
    renderHook(() => useRouteTitle());
    expect(document.title).toBe("Settings — OpenSIN Chat");
  });

  it("sets title for unknown route (not found)", () => {
    useLocation.mockReturnValue({ pathname: "/random-page" });
    renderHook(() => useRouteTitle());
    expect(document.title).toBe("Not Found — OpenSIN Chat");
  });

  it("updates title when pathname changes", () => {
    useLocation.mockReturnValue({ pathname: "/" });
    const { rerender } = renderHook(() => useRouteTitle());
    expect(document.title).toBe("OpenSIN Chat");

    useLocation.mockReturnValue({ pathname: "/settings/system" });
    rerender();
    expect(document.title).toBe("Settings — OpenSIN Chat");
  });
});
