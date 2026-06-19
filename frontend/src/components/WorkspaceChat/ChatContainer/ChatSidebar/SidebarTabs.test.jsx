// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

const openSidebar = vi.fn();
const setMemoriesActiveTab = vi.fn();

// Stable per-test mutable state
let mockState = {
  activeSidebar: "memories",
  activeMemoriesTab: "workspace",
};

vi.mock("../ChatSidebar", () => ({
  useChatSidebar: () => ({
    activeSidebar: mockState.activeSidebar,
    sidebarData: null,
    openSidebar: (...args) => openSidebar(...args),
  }),
}));

vi.mock("../MemoriesSidebar/MemoriesContext", () => ({
  useMemoriesContext: () => ({
    activeTab: mockState.activeMemoriesTab,
    setActiveTab: (...args) => setMemoriesActiveTab(...args),
    memories: { workspace: [], global: [] },
  }),
  LIMITS: { workspace: 20, global: 5 },
}));

// SidebarTabs uses phosphor icons; render placeholders to keep DOM small
vi.mock("@phosphor-icons/react/dist/csr/BookOpen", () => ({ default: (props) => <svg data-testid="icon-global" {...props} />, BookOpen: (props) => <svg data-testid="icon-global" {...props} /> }));
vi.mock("@phosphor-icons/react/dist/csr/FileText", () => ({ default: (props) => <svg data-testid="icon-sources" {...props} />, FileText: (props) => <svg data-testid="icon-sources" {...props} /> }));
vi.mock("@phosphor-icons/react/dist/csr/FolderOpen", () => ({ default: (props) => <svg data-testid="icon-workspace" {...props} />, FolderOpen: (props) => <svg data-testid="icon-workspace" {...props} /> }));;

import SidebarTabs from "./SidebarTabs";

describe("SidebarTabs", () => {
  beforeEach(() => {
    openSidebar.mockClear();
    setMemoriesActiveTab.mockClear();
    mockState.activeSidebar = "memories";
    mockState.activeMemoriesTab = "workspace";
  });

  it("renders all three pill labels", () => {
    render(<SidebarTabs />);
    expect(screen.getByText("Sources")).toBeInTheDocument();
    expect(screen.getByText("Workspace")).toBeInTheDocument();
    expect(screen.getByText("Global")).toBeInTheDocument();
  });

  it("Quellen pill calls openSidebar with 'sources' and the current sidebarData", () => {
    render(<SidebarTabs />);
    fireEvent.click(screen.getByText("Sources"));
    expect(openSidebar).toHaveBeenCalledWith("sources", null);
  });

  it("Arbeitsbereich pill calls setActiveTab('workspace') when memories is active", () => {
    render(<SidebarTabs />);
    fireEvent.click(screen.getByText("Workspace"));
    expect(setMemoriesActiveTab).toHaveBeenCalledWith("workspace");
  });

  it("Global pill calls setActiveTab('global') when memories is active", () => {
    render(<SidebarTabs />);
    fireEvent.click(screen.getByText("Global"));
    expect(setMemoriesActiveTab).toHaveBeenCalledWith("global");
  });

  it("When memories is NOT active, Global pill also switches to memories sidebar", () => {
    // Simulate user clicking Global from inside the Sources sidebar
    // (SidebarTabs is also rendered inside SourcesSidebar)
    mockState.activeSidebar = "sources";
    render(<SidebarTabs />);
    fireEvent.click(screen.getByText("Global"));
    expect(openSidebar).toHaveBeenCalledWith("memories", null);
    expect(setMemoriesActiveTab).toHaveBeenCalledWith("global");
  });

  it("Arbeitsbereich pill also switches to memories sidebar when memories is not active", () => {
    mockState.activeSidebar = "sources";
    render(<SidebarTabs />);
    fireEvent.click(screen.getByText("Workspace"));
    expect(openSidebar).toHaveBeenCalledWith("memories", null);
    expect(setMemoriesActiveTab).toHaveBeenCalledWith("workspace");
  });

  it("Global pill is reachable (does not overflow under icon bar) — layout sanity check", () => {
    const { container } = render(<SidebarTabs />);
    // The flex row must declare flex-wrap so the Global pill can wrap
    // to a second line on narrow viewports.
    const innerRow = container.querySelector("div.flex.flex-wrap");
    expect(innerRow).not.toBeNull();
    // All three pills must be in the DOM (the bug was that the rightmost
    // pill was clipped behind the icon column and `elementFromPoint`
    // returned the icon button instead of the pill).
    const pills = container.querySelectorAll("button");
    expect(pills.length).toBe(3);
    // All three must declare `min-w-0` so flex-shrink can wrap them
    pills.forEach((p) => {
      expect(p.className).toMatch(/min-w-0/);
    });
  });
});
