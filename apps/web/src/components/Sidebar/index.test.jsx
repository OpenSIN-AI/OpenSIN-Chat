// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
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

vi.mock("@/features/global-search/GlobalSearchProvider", () => ({
  useGlobalSearchDialog: () => ({ openSearch: vi.fn() }),
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

const newThreadMock = vi.fn().mockResolvedValue({
  thread: { slug: "new-thread" },
  error: null,
});

vi.mock("@/models/workspace", () => ({
  default: { threads: { new: (...args) => newThreadMock(...args) } },
}));

vi.mock("@/hooks/useWorkspaces", () => ({
  default: () => ({
    workspaces: [{ id: 1, name: "OpenSIN", slug: "opensin" }],
    isLoading: false,
  }),
}));

vi.mock("../Footer", () => ({
  default: () => <footer data-testid="footer" />,
}));

vi.mock("../SettingsButton", () => ({
  default: () => (
    <button type="button" aria-label="settings" data-testid="settings-button" />
  ),
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
    <button
      type="button"
      aria-label="toggle sidebar"
      data-testid="sidebar-toggle"
    />
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

  it("renders the OpenSIN brand control", () => {
    renderSidebar();
    expect(
      screen.getByRole("button", { name: /opensin/i }),
    ).toBeInTheDocument();
  });

  it("renders exactly the three focused primary navigation entries", () => {
    const { container } = renderSidebar();
    const entries = Array.from(
      container.querySelectorAll("[data-primary-navigation]"),
    );
    expect(entries).toHaveLength(3);
    expect(
      entries.map((entry) => entry.getAttribute("data-primary-navigation")),
    ).toEqual(["chats", "sources", "research"]);
  });

  it("renders ActiveWorkspaces without the removed workspace switcher", () => {
    renderSidebar();
    expect(screen.getByTestId("active-workspaces")).toBeInTheDocument();
    expect(screen.queryByTestId("workspace-switcher")).not.toBeInTheDocument();
  });

  it("creates a chat in the active workspace", async () => {
    renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: /new chat/i }));
    await waitFor(() => expect(newThreadMock).toHaveBeenCalledWith("opensin"));
  });

  it("renders the Footer inside the sidebar", () => {
    renderSidebar();
    expect(screen.getByTestId("footer")).toBeInTheDocument();
  });

  it("renders the resize slider when the sidebar is visible", () => {
    renderSidebar();
    const slider = screen.getByRole("slider", {
      name: /resize sidebar/i,
    });
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveAttribute("min", "260");
    expect(slider).toHaveAttribute("max", "420");
  });
});
