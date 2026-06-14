// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import Sidebars from "./Sidebars";
vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

const mockUseChatSidebar = vi.fn();

vi.mock("./ChatSidebar", () => ({
  useChatSidebar: () => mockUseChatSidebar(),
}));

vi.mock("./SourcesSidebar", () => ({
  default: (props) => <div data-testid="sources-sidebar" {...props} />,
}));

vi.mock("./MemoriesSidebar", () => ({
  default: (props) => <div data-testid="memories-sidebar" {...props} />,
}));

vi.mock("./PreviewSidebar", () => ({
  default: (props) => <div data-testid="preview-sidebar" {...props} />,
}));

vi.mock("./ConsoleSidebar", () => ({
  default: (props) => <div data-testid="console-sidebar" {...props} />,
}));

vi.mock("./FilesystemSidebar", () => ({
  default: (props) => <div data-testid="filesystem-sidebar" {...props} />,
}));

vi.mock("./DatabaseSidebar", () => ({
  default: (props) => <div data-testid="database-sidebar" {...props} />,
}));

vi.mock("./PoliticalSidebar", () => ({
  default: (props) => <div data-testid="political-sidebar" {...props} />,
}));

vi.mock("./RightSidebarIconBar", () => ({
  default: () => <div data-testid="right-sidebar-icon-bar" />,
}));

const workspace = { id: 1, name: "Test Workspace" };

describe("Sidebars", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the active panel when sidebar is open with activeSidebar", () => {
    mockUseChatSidebar.mockReturnValue({
      activeSidebar: "sources",
    });
    render(<Sidebars workspace={workspace} />);
    expect(screen.getByTestId("sources-sidebar")).toBeInTheDocument();
    expect(screen.getByTestId("right-sidebar-icon-bar")).toBeInTheDocument();
  });

  it("renders nothing in panel area when no activeSidebar", () => {
    mockUseChatSidebar.mockReturnValue({
      activeSidebar: null,
    });
    render(<Sidebars workspace={workspace} />);
    expect(screen.queryByTestId("sources-sidebar")).not.toBeInTheDocument();
    expect(screen.queryByTestId("memories-sidebar")).not.toBeInTheDocument();
    expect(screen.queryByTestId("preview-sidebar")).not.toBeInTheDocument();
    expect(screen.queryByTestId("console-sidebar")).not.toBeInTheDocument();
    expect(screen.queryByTestId("filesystem-sidebar")).not.toBeInTheDocument();
    expect(screen.queryByTestId("database-sidebar")).not.toBeInTheDocument();
    expect(screen.queryByTestId("political-sidebar")).not.toBeInTheDocument();
    expect(screen.getByTestId("right-sidebar-icon-bar")).toBeInTheDocument();
  });

  it("renders icon bar regardless of activeSidebar", () => {
    mockUseChatSidebar.mockReturnValue({
      activeSidebar: null,
    });
    render(<Sidebars workspace={workspace} />);
    expect(screen.getByTestId("right-sidebar-icon-bar")).toBeInTheDocument();
  });

  it("panel width is 360px when shown", () => {
    mockUseChatSidebar.mockReturnValue({
      activeSidebar: "sources",
    });
    const { container } = render(<Sidebars workspace={workspace} />);
    const panel = container.querySelector('[style*="width: 360px"]');
    expect(panel).toBeInTheDocument();
  });

  it.each([
    ["sources", "sources-sidebar"],
    ["memories", "memories-sidebar"],
    ["preview", "preview-sidebar"],
    ["console", "console-sidebar"],
    ["filesystem", "filesystem-sidebar"],
    ["database", "database-sidebar"],
    ["political", "political-sidebar"],
  ])("renders %s panel when activeSidebar is '%s'", (name, testid) => {
    mockUseChatSidebar.mockReturnValue({
      activeSidebar: name,
    });
    render(<Sidebars workspace={workspace} />);
    expect(screen.getByTestId(testid)).toBeInTheDocument();
  });
});
