// SPDX-License-Identifier: MIT
/**
 * Tests for the consolidated Quellen (SourcesSidebar) panel: header title,
 * the 5-tab strip, default tab selection, and switching between tab bodies.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

// Never take the mobile path in these tests.
vi.mock("@/hooks/useIsMobileLayout", () => ({
  useIsMobileLayout: () => false,
}));

let mockSourcesState = {
  sources: [],
  sidebarOpen: true,
  closeSidebar: vi.fn(),
};

vi.mock("../ChatSidebar", () => ({
  __esModule: true,
  default: ({ children, isOpen }) => (isOpen ? <div>{children}</div> : null),
  useSourcesSidebar: () => mockSourcesState,
  useChatSidebar: () => ({
    sourceFilter: "all",
    isDocumentSource: () => true,
    isMediaSource: () => false,
  }),
}));

// MemoriesProvider is a passthrough; its child tab bodies are stubbed.
vi.mock("../MemoriesSidebar/MemoriesContext", () => ({
  MemoriesProvider: ({ children }) => <div>{children}</div>,
}));

vi.mock("../MemoriesSidebar", () => ({
  MemoriesTabBody: () => <div data-testid="memories-body" />,
  MemoryModalWrapper: () => null,
  WorkspaceChatsTab: () => <div data-testid="chats-body" />,
  WorkspaceUrlsTab: () => <div data-testid="urls-body" />,
}));

vi.mock("../FilesystemSidebar", () => ({
  FilesystemPanelBody: () => <div data-testid="dateien-body" />,
}));

vi.mock("./SourceItem", () => ({
  default: ({ source }) => <div data-testid="source-item">{source.title}</div>,
}));

vi.mock("./MobileCitationModal", () => ({
  default: () => <div data-testid="mobile-modal" />,
}));

vi.mock("../ChatHistory/Citation", () => ({
  combineLikeSources: (s) => s || [],
  CitationDetailModal: () => <div data-testid="citation-modal" />,
}));

import SourcesSidebar from "./index";

const workspace = { slug: "ws", name: "WS", documents: [] };

describe("SourcesSidebar (Quellen panel)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSourcesState = {
      sources: [],
      sidebarOpen: true,
      closeSidebar: vi.fn(),
    };
  });

  it("renders the Quellen header and all 5 tab labels", () => {
    render(<SourcesSidebar workspace={workspace} />);
    // Header title resolves via the English i18n mock ("Sources" == Quellen).
    expect(
      screen.getByRole("heading", { name: "Sources" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Files")).toBeInTheDocument(); // Dateien
    expect(screen.getByText("Cited")).toBeInTheDocument(); // Zitiert
    expect(screen.getByText("Memories")).toBeInTheDocument(); // Erinnerungen
    expect(screen.getByText("Chats")).toBeInTheDocument();
    expect(screen.getByText("URLs")).toBeInTheDocument();
  });

  it("defaults to the Dateien tab when there are no cited sources", () => {
    render(<SourcesSidebar workspace={workspace} />);
    expect(screen.getByTestId("dateien-body")).toBeInTheDocument();
  });

  it("defaults to the Zitiert tab when cited sources exist", () => {
    mockSourcesState.sources = [{ title: "Doc A", chunks: [{}] }];
    render(<SourcesSidebar workspace={workspace} />);
    expect(screen.getByTestId("source-item")).toBeInTheDocument();
    expect(screen.queryByTestId("dateien-body")).not.toBeInTheDocument();
  });

  it("switches to the Erinnerungen tab body when clicked", () => {
    render(<SourcesSidebar workspace={workspace} />);
    fireEvent.click(screen.getByText("Memories"));
    expect(screen.getByTestId("memories-body")).toBeInTheDocument();
  });

  it("switches to the Chats and URLs tab bodies when clicked", () => {
    render(<SourcesSidebar workspace={workspace} />);
    fireEvent.click(screen.getByText("Chats"));
    expect(screen.getByTestId("chats-body")).toBeInTheDocument();
    fireEvent.click(screen.getByText("URLs"));
    expect(screen.getByTestId("urls-body")).toBeInTheDocument();
  });
});
