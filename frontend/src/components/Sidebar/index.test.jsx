// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

// Stub heavy / network-touching dependencies so we can render the desktop
// Sidebar in isolation. Each stub returns the minimum surface area used by
// the component under test.
vi.mock("@/hooks/useLogo", () => ({
  default: () => ({ logo: "data:image/png;base64,FAKE" }),
}));

vi.mock("@/hooks/useUser", () => ({
  default: () => ({ user: { id: 1, role: "admin" } }),
}));

vi.mock("../Modals/NewWorkspace", () => ({
  default: () => null,
  useNewWorkspaceModal: () => ({
    showing: false,
    showModal: vi.fn(),
    hideModal: vi.fn(),
  }),
}));

vi.mock("./ActiveWorkspaces", () => ({
  default: () => <div data-testid="active-workspaces" />,
}));

vi.mock("../Footer", () => ({
  default: () => <footer data-testid="footer" />,
}));

vi.mock("../SettingsButton", () => ({
  default: () => <button type="button" data-testid="settings-button" />,
}));

vi.mock("./SearchBox", () => ({
  default: () => <div data-testid="search-box" />,
}));

vi.mock("react-tooltip", () => ({
  Tooltip: () => null,
}));

vi.mock("./SidebarToggle", () => ({
  useSidebarToggle: () => ({
    showSidebar: true,
    setShowSidebar: vi.fn(),
    canToggleSidebar: true,
  }),
  ToggleSidebarButton: () => (
    <button type="button" data-testid="sidebar-toggle" />
  ),
}));

import Sidebar from "@/components/Sidebar";

function renderSidebar({ initialPath = "/" } = {}) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="*" element={<Sidebar />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Sidebar (desktop)", () => {
  it("renders the navigation landmark", () => {
    renderSidebar();
    expect(
      screen.getByRole("navigation", { name: /main navigation/i }),
    ).toBeInTheDocument();
  });

  it("renders the OpenSIN brand link to the home page", () => {
    renderSidebar();
    const homeLink = screen.getByRole("link", { name: /home/i });
    expect(homeLink).toBeInTheDocument();
    expect(homeLink.getAttribute("href")).toBe("/");
  });

  it("renders the SearchBox and ActiveWorkspaces children", () => {
    renderSidebar();
    expect(screen.getByTestId("search-box")).toBeInTheDocument();
    expect(screen.getByTestId("active-workspaces")).toBeInTheDocument();
  });

  it("renders the Footer inside the sidebar", () => {
    renderSidebar();
    expect(screen.getByTestId("footer")).toBeInTheDocument();
  });

  it("renders the resize handle when the sidebar is visible", () => {
    renderSidebar();
    const handle = screen.getByRole("separator", {
      name: /resize sidebar/i,
    });
    expect(handle).toBeInTheDocument();
    expect(handle).toHaveAttribute("aria-orientation", "vertical");
  });
});
