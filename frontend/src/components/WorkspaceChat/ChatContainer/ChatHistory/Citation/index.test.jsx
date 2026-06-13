// SPDX-License-Identifier: MIT
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import Citations, {
  CitationDetailModal,
  SourceTypeCircle,
  combineLikeSources,
  getCustomImage,
  omitChunkHeader,
  parseChunkSource,
} from "./index";

vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

vi.mock("@/components/ModalWrapper", () => ({
  default: ({ isOpen, children }) => (isOpen ? children : null),
}));

vi.mock("../../ChatSidebar", () => ({
  useSourcesSidebar: () => ({
    sidebarOpen: false,
    openSidebar: vi.fn(),
    closeSidebar: vi.fn(),
    sources: null,
  }),
}));

vi.mock("he", () => ({
  decode: (s) => s,
}));

vi.mock("truncate", () => ({
  default: (s, len) => (s.length > len ? s.slice(0, len) : s),
}));

vi.mock("@phosphor-icons/react", () => ({
  FileText: ({ size }) => <span data-testid="icon-filetext">FT</span>,
  Info: ({ size }) => <span data-testid="icon-info">Info</span>,
  ArrowSquareOut: () => <span>ArrowOut</span>,
  GithubLogo: () => <span>GH</span>,
  X: () => <span>X</span>,
  YoutubeLogo: () => <span>YT</span>,
  LinkSimple: () => <span>Link</span>,
  GitlabLogo: () => <span>GL</span>,
}));

vi.mock("@/pages/Admin/Agents/GMailSkillPanel/gmail.png", () => ({
  default: "gmail-mock.png",
}));
vi.mock(
  "@/pages/Admin/Agents/GoogleCalendarSkillPanel/google-calendar.png",
  () => ({ default: "gcal-mock.png" }),
);
vi.mock("@/pages/Admin/Agents/OutlookSkillPanel/outlook.png", () => ({
  default: "outlook-mock.png",
}));

vi.mock("@/utils/numbers", () => ({
  toPercentString: (n) => `${Math.round(n * 100)}%`,
}));

describe("Citation", () => {
  describe("combineLikeSources", () => {
    it("combines sources with same title", () => {
      const sources = [
        { id: 1, title: "Doc A", text: "chunk1", chunkSource: "", score: 0.9 },
        { id: 2, title: "Doc A", text: "chunk2", chunkSource: "", score: 0.8 },
        { id: 3, title: "Doc B", text: "chunk3", chunkSource: "", score: 0.7 },
      ];
      const result = combineLikeSources(sources);
      expect(result).toHaveLength(2);
      expect(result.find((r) => r.title === "Doc A").references).toBe(2);
      expect(result.find((r) => r.title === "Doc A").chunks).toHaveLength(2);
      expect(result.find((r) => r.title === "Doc B").references).toBe(1);
    });

    it("returns empty array for empty input", () => {
      expect(combineLikeSources([])).toEqual([]);
    });
  });

  describe("omitChunkHeader", () => {
    it("returns text unchanged when no metadata tag", () => {
      expect(omitChunkHeader("hello world")).toBe("hello world");
    });

    it("strips document_metadata header", () => {
      const text = "<document_metadata>meta</document_metadata>real content";
      expect(omitChunkHeader(text)).toBe("real content");
    });
  });

  describe("parseChunkSource", () => {
    it("returns nullResponse for empty chunks", () => {
      const result = parseChunkSource({ title: "t", chunks: [] });
      expect(result.isUrl).toBe(false);
      expect(result.icon).toBe("file");
    });

    it("returns nullResponse for unsupported chunkSource", () => {
      const result = parseChunkSource({
        title: "t",
        chunks: [{ chunkSource: "unknown://foo" }],
      });
      expect(result.isUrl).toBe(false);
    });

    it("parses link:// source correctly", () => {
      const result = parseChunkSource({
        title: "My Page",
        chunks: [{ chunkSource: "link://https://example.com/path" }],
      });
      expect(result.icon).toBe("link");
      expect(result.isUrl).toBe(true);
    });

    it("parses youtube:// source correctly", () => {
      const result = parseChunkSource({
        title: "Video Title",
        chunks: [{ chunkSource: "youtube://https://youtube.com/watch?v=abc" }],
      });
      expect(result.icon).toBe("youtube");
      expect(result.text).toBe("Video Title");
    });

    it("parses github:// source correctly", () => {
      const result = parseChunkSource({
        title: "PR Title",
        chunks: [{ chunkSource: "github://https://github.com/org/repo" }],
      });
      expect(result.icon).toBe("github");
    });

    it("parses gitlab:// source correctly", () => {
      const result = parseChunkSource({
        title: "MR Title",
        chunks: [{ chunkSource: "gitlab://https://gitlab.com/org/repo" }],
      });
      expect(result.icon).toBe("gitlab");
    });

    it("parses gmail-thread:// source correctly", () => {
      const result = parseChunkSource({
        title: "Email Thread",
        chunks: [{ chunkSource: "gmail-thread://https://mail.google.com/123" }],
      });
      expect(result.icon).toBe("gmailThread");
    });
  });

  describe("getCustomImage", () => {
    it("returns image for gmailThread type", () => {
      expect(getCustomImage("gmailThread")).not.toBeNull();
    });

    it("returns null for file type", () => {
      expect(getCustomImage("file")).toBeNull();
    });
  });

  describe("SourceTypeCircle", () => {
    it("renders without crash with default type", () => {
      render(<SourceTypeCircle />);
      const container = document.querySelector(".rounded-full");
      expect(container).toBeInTheDocument();
    });

    it("renders with custom image when provided", () => {
      const { container } = render(<SourceTypeCircle customImage="test.png" />);
      const img = container.querySelector("img");
      expect(img).toBeInTheDocument();
      expect(img.getAttribute("src")).toBe("test.png");
    });

    it("renders favicon for link type with valid url", () => {
      const { container } = render(
        <SourceTypeCircle type="link" url="https://example.com" />,
      );
      const img = container.querySelector("img");
      expect(img).toBeInTheDocument();
      expect(img.getAttribute("src")).toContain("favicons?domain=example.com");
    });
  });

  describe("Citations", () => {
    it("returns null when sources is empty", () => {
      const { container } = render(<Citations sources={[]} />);
      expect(container.innerHTML).toBe("");
    });

    it("renders sources button with translated label", () => {
      const sources = [
        {
          id: 1,
          title: "Doc A",
          text: "text",
          chunkSource: "",
          score: null,
        },
      ];
      render(<Citations sources={sources} />);
      expect(screen.getByText("Sources")).toBeInTheDocument();
    });

    it("shows remaining count when more than 3 combined sources", () => {
      const sources = Array.from({ length: 5 }, (_, i) => ({
        id: i,
        title: `Doc ${i}`,
        text: "text",
        chunkSource: "",
        score: null,
      }));
      render(<Citations sources={sources} />);
      expect(screen.getByText("+ 2")).toBeInTheDocument();
    });
  });

  describe("CitationDetailModal", () => {
    const mockSource = {
      title: "Test Document",
      references: 1,
      chunks: [{ text: "chunk text content", score: 0.85, chunkSource: "" }],
    };

    it("renders modal when source is provided", () => {
      render(<CitationDetailModal source={mockSource} onClose={vi.fn()} />);
      expect(screen.getByText("Test Document")).toBeInTheDocument();
    });

    it("renders close button and calls onClose", () => {
      const onClose = vi.fn();
      render(<CitationDetailModal source={mockSource} onClose={onClose} />);
      const closeBtn = screen.getByRole("button");
      fireEvent.click(closeBtn);
      expect(onClose).toHaveBeenCalled();
    });

    it("shows reference count when references > 1", () => {
      const multiRef = { ...mockSource, references: 3 };
      render(<CitationDetailModal source={multiRef} onClose={vi.fn()} />);
      expect(screen.getByText(/Referenced 3 times/)).toBeInTheDocument();
    });

    it("shows similarity score when score is present", () => {
      render(<CitationDetailModal source={mockSource} onClose={vi.fn()} />);
      expect(screen.getByText(/Similarity match/i)).toBeInTheDocument();
    });

    it("renders as link when source is a URL type", () => {
      const urlSource = {
        title: "Test Page",
        references: 1,
        chunks: [
          {
            text: "chunk",
            score: null,
            chunkSource: "link://https://example.com/path",
          },
        ],
      };
      render(<CitationDetailModal source={urlSource} onClose={vi.fn()} />);
      const link = screen.getByRole("link");
      expect(link).toBeInTheDocument();
    });
  });
});
