// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  within,
  waitFor,
} from "@testing-library/react";
import { useEffect } from "react";
import type { DocHeading } from "@/pages/Docs/DocsMarkdown";
import { MemoryRouter, Routes, Route } from "react-router";
import Docs from "@/pages/Docs";

vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useParams: vi.fn(),
  };
});

vi.mock("@/components/ThemeToggle", () => ({
  default: () => <button data-testid="theme-toggle">Theme</button>,
}));

vi.mock("@/pages/Docs/DocsMarkdown", () => ({
  default: function DocsMarkdownMock({
    onHeadings,
    content,
  }: {
    onHeadings?: (headings: DocHeading[]) => void;
    content: string;
  }) {
    useEffect(() => {
      const timer = setTimeout(() => {
        onHeadings?.([
          { id: "intro", text: "Intro", level: 2 },
          { id: "details", text: "Details", level: 2 },
        ]);
      }, 0);
      return () => clearTimeout(timer);
    }, [onHeadings]);
    return <div data-testid="docs-markdown">{content}</div>;
  },
}));

const docsTocMock = vi.fn();

vi.mock("@/pages/Docs/DocsToc", () => ({
  default: ({
    headings,
    onNavigate,
  }: {
    headings: DocHeading[];
    onNavigate?: () => void;
  }) => {
    docsTocMock(headings);
    return (
      <nav data-testid="docs-toc" aria-label="On this page">
        <ul>
          {[
            { id: "intro", text: "Intro" },
            { id: "details", text: "Details" },
          ].map((heading) => (
            <li key={heading.id}>
              <a
                href={`#${heading.id}`}
                onClick={() => onNavigate?.()}
                data-testid={`toc-${heading.id}`}
              >
                {heading.text}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    );
  },
}));

vi.mock("@/pages/Docs/DocsLanding", () => ({
  default: ({
    audience,
  }: {
    audience: string;
    onAudienceChange: (a: string) => void;
  }) => <div data-testid="docs-landing">Docs Landing ({audience})</div>,
}));

vi.mock("@/pages/Docs/docsManifest", () => {
  const testDocEntry = {
    slug: "test-doc",
    title: "Test Document",
    description: "A test document for unit tests.",
    category: "test" as any,
    audience: "both" as const,
    file: "test-doc.md",
    source: "docs/test-doc.md",
  };
  return {
    CATEGORY_LABELS: { test: "Test Category" },
    getCategoryLabel: vi.fn(() => "Test Category"),
    CATEGORY_ORDER: ["test"],
    DEFAULT_DOCS_AUDIENCE: "user",
    DOCS_AUDIENCE_PARAM: "audience",
    DOCS_AUDIENCE_STORAGE_KEY: "docs-audience",
    docsHref: (slug?: string | null, audience?: string | null) => {
      const path = slug ? `/docs/${slug}` : "/docs";
      return audience ? `${path}?audience=${audience}` : path;
    },
    entryMatchesAudience: vi.fn(() => true),
    parseDocsAudience: (value: string | null | undefined) => {
      if (value === "user" || value === "developer") return value;
      return null;
    },
    preferredAudienceForEntry: vi.fn(() => "user"),
    DOC_ENTRIES: [testDocEntry],
    getDocBySlug: vi.fn(),
    getDocContent: vi.fn(),
    getGroupedDocs: vi.fn(() => [
      {
        category: "test" as any,
        entries: [testDocEntry],
      },
    ]),
    getAdjacentDocs: vi.fn(() => ({ prev: null, next: null })),
    getEditUrl: vi.fn(
      () =>
        "https://github.com/OpenSIN-AI/OpenSIN-Chat/blob/main/docs/test-doc.md",
    ),
  };
});

import { useParams } from "react-router";
import { getDocBySlug, getDocContent } from "@/pages/Docs/docsManifest";

const mockedUseParams = vi.mocked(useParams);

function getFloatingTocButton() {
  return screen
    .getAllByRole("button")
    .find(
      (btn) =>
        btn.className.includes("fixed") && btn.className.includes("bottom-6"),
    );
}

function renderDocs(initialPath = "/docs/test-doc") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/docs/:slug" element={<Docs />} />
        <Route path="/docs" element={<Docs />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  docsTocMock.mockClear();
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === "(min-width: 1024px)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
  global.IntersectionObserver = class IntersectionObserver {
    observe = vi.fn();
    disconnect = vi.fn();
    unobserve = vi.fn();
    takeRecords = vi.fn(() => []);
    root: Element | null = null;
    rootMargin = "0px";
    thresholds: readonly number[] = [];
  } as unknown as typeof IntersectionObserver;
  if (!HTMLElement.prototype.scrollTo) {
    HTMLElement.prototype.scrollTo =
      vi.fn() as unknown as typeof HTMLElement.prototype.scrollTo;
  }
});

describe("Docs page", () => {
  it("renders ThemeToggle in the header", () => {
    mockedUseParams.mockReturnValue({ slug: "test-doc", audience: "both" as any });
    vi.mocked(getDocBySlug).mockReturnValue({
      slug: "test-doc",
      title: "Test Document",
      description: "A test document.",
      category: "test" as any,
      audience: "both",
      file: "test-doc.md",
      source: "docs/test-doc.md",
    });
    vi.mocked(getDocContent).mockReturnValue("# Test");
    renderDocs();
    expect(screen.getByTestId("theme-toggle")).toBeInTheDocument();
  });

  it("renders the back to app link", () => {
    mockedUseParams.mockReturnValue({ slug: "test-doc", audience: "both" as any });
    vi.mocked(getDocBySlug).mockReturnValue({
      slug: "test-doc",
      title: "Test Document",
      description: "A test document.",
      category: "test" as any,
      audience: "both",
      file: "test-doc.md",
      source: "docs/test-doc.md",
    });
    vi.mocked(getDocContent).mockReturnValue("# Test");
    renderDocs();
    expect(screen.getByText("Back to App")).toBeInTheDocument();
  });

  it("renders the right-hand TOC with hidden lg:block classes", () => {
    mockedUseParams.mockReturnValue({ slug: "test-doc", audience: "both" as any });
    vi.mocked(getDocBySlug).mockReturnValue({
      slug: "test-doc",
      title: "Test Document",
      description: "A test document.",
      category: "test" as any,
      audience: "both",
      file: "test-doc.md",
      source: "docs/test-doc.md",
    });
    vi.mocked(getDocContent).mockReturnValue("# Test");
    renderDocs();
    const rightToc = screen.getByTestId("docs-toc");
    expect(rightToc).toBeInTheDocument();
    const rightTocAside = rightToc.closest("aside");
    expect(rightTocAside).toHaveClass("hidden", "lg:block");
  });

  it("renders the floating TOC button with lg:hidden on mobile", () => {
    mockedUseParams.mockReturnValue({ slug: "test-doc", audience: "both" as any });
    vi.mocked(getDocBySlug).mockReturnValue({
      slug: "test-doc",
      title: "Test Document",
      description: "A test document.",
      category: "test" as any,
      audience: "both",
      file: "test-doc.md",
      source: "docs/test-doc.md",
    });
    vi.mocked(getDocContent).mockReturnValue("# Test");
    renderDocs();
    const floatingButton = getFloatingTocButton();
    expect(floatingButton).toBeInTheDocument();
    expect(floatingButton).toHaveClass("lg:hidden");
  });

  it("opens the mobile TOC drawer when the floating button is clicked", async () => {
    mockedUseParams.mockReturnValue({ slug: "test-doc", audience: "both" as any });
    vi.mocked(getDocBySlug).mockReturnValue({
      slug: "test-doc",
      title: "Test Document",
      description: "A test document.",
      category: "test" as any,
      audience: "both",
      file: "test-doc.md",
      source: "docs/test-doc.md",
    });
    vi.mocked(getDocContent).mockReturnValue("# Test");
    renderDocs();
    await waitFor(() => {
      expect(docsTocMock).toHaveBeenCalled();
    });
    const floatingButton = getFloatingTocButton();
    expect(floatingButton).toBeInTheDocument();
    fireEvent.click(floatingButton!);
    const mobileDrawer = screen.getByRole("dialog", { name: "On this page" });
    expect(mobileDrawer).toBeInTheDocument();
    expect(within(mobileDrawer).getByTestId("docs-toc")).toBeInTheDocument();
  });

  it("closes the mobile TOC drawer when a TOC item is clicked", async () => {
    mockedUseParams.mockReturnValue({ slug: "test-doc", audience: "both" as any });
    vi.mocked(getDocBySlug).mockReturnValue({
      slug: "test-doc",
      title: "Test Document",
      description: "A test document.",
      category: "test" as any,
      audience: "both",
      file: "test-doc.md",
      source: "docs/test-doc.md",
    });
    vi.mocked(getDocContent).mockReturnValue("# Test");
    renderDocs();
    await waitFor(() => {
      expect(docsTocMock).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: "intro", text: "Intro" }),
        ]),
      );
    });
    const floatingButton = getFloatingTocButton();
    fireEvent.click(floatingButton!);
    const mobileDrawer = screen.getByRole("dialog", { name: "On this page" });
    const tocIntro = within(mobileDrawer).getByTestId("toc-intro");
    fireEvent.click(tocIntro);
    expect(
      screen.queryByRole("dialog", { name: "On this page" }),
    ).not.toBeInTheDocument();
  });

  it("passes extracted headings to DocsToc", async () => {
    mockedUseParams.mockReturnValue({ slug: "test-doc", audience: "both" as any });
    vi.mocked(getDocBySlug).mockReturnValue({
      slug: "test-doc",
      title: "Test Document",
      description: "A test document.",
      category: "test" as any,
      audience: "both",
      file: "test-doc.md",
      source: "docs/test-doc.md",
    });
    vi.mocked(getDocContent).mockReturnValue("# Test");
    renderDocs();
    await waitFor(() => {
      expect(docsTocMock).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: "intro", text: "Intro", level: 2 }),
          expect.objectContaining({ id: "details", text: "Details", level: 2 }),
        ]),
      );
    });
    const tocs = screen.getAllByTestId("docs-toc");
    expect(tocs.length).toBeGreaterThan(0);
    tocs.forEach((toc) => {
      expect(within(toc).getByText("Intro")).toBeInTheDocument();
      expect(within(toc).getByText("Details")).toBeInTheDocument();
    });
  });

  it("passes the markdown content to DocsMarkdown", () => {
    mockedUseParams.mockReturnValue({ slug: "test-doc", audience: "both" as any });
    vi.mocked(getDocBySlug).mockReturnValue({
      slug: "test-doc",
      title: "Test Document",
      description: "A test document.",
      category: "test" as any,
      audience: "both",
      file: "test-doc.md",
      source: "docs/test-doc.md",
    });
    vi.mocked(getDocContent).mockReturnValue("# Test Content");
    renderDocs();
    expect(screen.getByTestId("docs-markdown")).toHaveTextContent(
      "# Test Content",
    );
  });
});
