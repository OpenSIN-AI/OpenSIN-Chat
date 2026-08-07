// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import RightSidebarIconBar from "./index";

vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

const mockToggleSidebar = vi.fn();

vi.mock("../ChatSidebar", () => ({
  useChatSidebar: () => ({
    activeSidebar: null,
    toggleSidebar: mockToggleSidebar,
  }),
}));

vi.mock("../AgentSessionsSidebar/AgentRunsContext", () => ({
  useAgentRuns: () => ({ activeRunCount: 0 }),
}));

function renderMenu() {
  render(
    <MemoryRouter>
      <RightSidebarIconBar />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Tools" }));
}

describe("RightSidebarIconBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows one calm tools trigger instead of a permanent icon rail", () => {
    render(
      <MemoryRouter>
        <RightSidebarIconBar />
      </MemoryRouter>,
    );
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Tools" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("reveals optional panels only after opening the tools menu", () => {
    renderMenu();
    expect(screen.getAllByRole("menuitem")).toHaveLength(5);
    expect(screen.getByRole("menuitem", { name: "Sources" })).toBeVisible();
    expect(screen.getByRole("menuitem", { name: "Notepad" })).toBeVisible();
    expect(screen.getByRole("menuitem", { name: "Preview" })).toBeVisible();
  });

  it("opens preview and closes the menu", () => {
    renderMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "Preview" }));
    expect(mockToggleSidebar).toHaveBeenCalledWith("preview");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("opens sources from the consolidated menu", () => {
    renderMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "Sources" }));
    expect(mockToggleSidebar).toHaveBeenCalledWith("sources");
  });
});
