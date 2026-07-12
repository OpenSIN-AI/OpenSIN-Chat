// SPDX-License-Identifier: MIT
// Purpose: Regression coverage for chat citation filtering in the sources sidebar.
// Docs: index.test.doc.md
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import SourcesSidebar from "./index";

const mocks = vi.hoisted(() => ({
  closeSidebar: vi.fn(),
  sources: [],
  chatSidebar: {},
}));

vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

vi.mock("@/hooks/useIsMobileLayout", () => ({
  useIsMobileLayout: () => false,
}));

vi.mock("../ChatSidebar/SidebarTabs", () => ({
  default: () => <div data-testid="sidebar-tabs" />,
}));

vi.mock("../MemoriesSidebar/MemoriesContext", () => ({
  MemoriesProvider: ({ children }) => children,
}));

vi.mock("./SourceItem", () => ({
  default: ({ source }) => <div data-testid="chat-source">{source.title}</div>,
}));

vi.mock("./MobileCitationModal", () => ({
  default: () => <div data-testid="mobile-citation-modal" />,
}));

vi.mock("../ChatSidebar", () => ({
  default: ({ children }) => <aside>{children}</aside>,
  useSourcesSidebar: () => ({
    sources: mocks.sources,
    sidebarOpen: true,
    closeSidebar: mocks.closeSidebar,
  }),
  useChatSidebar: () => mocks.chatSidebar,
}));

const workspace = {
  documents: [
    {
      docId: "workspace-doc",
      filename: "Workspace Doc",
      metadata: JSON.stringify({ title: "Workspace Doc" }),
    },
  ],
};

function isDocumentSource(chunkSource) {
  if (!chunkSource) return true;
  if (chunkSource.startsWith("link://")) return false;
  if (chunkSource.startsWith("youtube://")) return false;
  return !chunkSource.includes("://");
}

describe("SourcesSidebar", () => {
  beforeEach(() => {
    mocks.sources = [];
    mocks.chatSidebar = {
      sourceFilter: "all",
      isDocumentSource,
      isMediaSource: (chunkSource) => chunkSource?.startsWith("youtube://"),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("does not fall back to workspace documents when a chat-source filter has no matches", () => {
    mocks.chatSidebar.sourceFilter = "documents";
    mocks.sources = [
      {
        title: "Web Result",
        text: "web chunk",
        chunkSource: "link://https://example.com",
      },
    ];

    render(<SourcesSidebar workspace={workspace} />);

    expect(screen.queryByText("Workspace Doc")).not.toBeInTheDocument();
    expect(
      screen.getByText("No sources found for filter 'Documents'"),
    ).toBeInTheDocument();
  });

  it("matches filters against every chunk in a grouped citation source", () => {
    mocks.chatSidebar.sourceFilter = "documents";
    mocks.sources = [
      {
        title: "Mixed Source",
        chunks: [
          { text: "video chunk", chunkSource: "youtube://https://youtu.be/x" },
          { text: "document chunk", chunkSource: "local-report.pdf" },
        ],
      },
    ];

    render(<SourcesSidebar workspace={workspace} />);

    expect(screen.getByTestId("chat-source")).toHaveTextContent("Mixed Source");
  });
});
