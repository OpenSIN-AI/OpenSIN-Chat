// SPDX-License-Identifier: MIT
/**
 * Unit tests for the chat markdown renderer.
 *
 * These tests use the REAL markdown-it instance (only katex, appearance,
 * uuid, hljs, and CSS side-effects are mocked) so we exercise the actual
 * rendering pipeline including the custom strong/link/image renderer rules.
 *
 * Coverage focus (GitHub Issue #22 — critical paths):
 *   - Excessive newline collapsing (3+ → 2)
 *   - HTML sanitization / escaping with html:false (script tags neutralised)
 *   - Empty-string edge case
 *   - Fenced code block preservation
 *   - Basic markdown: bold, links, headings
 *
 * Docs: utils/chat/markdown.ts
 * Purpose: Verify the markdown renderer handles security-critical and
 * formatting-critical paths correctly.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────────
// Mock katex so the plugin doesn't pull in the real KaTeX runtime.
vi.mock("katex", () => ({
  default: { renderToString: (s: string) => `<span class="katex">${s}</span>` },
}));

// Appearance.get("renderHTML") controls the markdown-it `html` option.
// Default: false — raw HTML is escaped, not rendered.
vi.mock("@/models/appearance", () => ({
  default: {
    get: (key: string) => (key === "renderHTML" ? false : undefined),
  },
}));

vi.mock("uuid", () => ({ v4: () => "test-uuid" }));

// Minimal hljs mock — known languages return a truthy object from getLanguage.
// Now that markdown.ts imports from ./hljs (which wraps highlight.js/lib/core),
// we mock the wrapper module directly.
vi.mock("./hljs", () => {
  const hljs = {
    registerLanguage: vi.fn(),
    getLanguage: vi.fn((lang: string) =>
      lang === "svelte" || lang === "js" || lang === "python" ? {} : null,
    ),
    highlight: (code: string, opts: { language?: string }) => ({
      value: `<span class="hljs">${code}</span>`,
      language: opts?.language,
    }),
  };
  return { default: hljs };
});

vi.mock("./hljs-libraries/svelte", () => ({ default: {} }));

// CSS side-effect imports — stub to nothing so jsdom is happy.
vi.mock("./themes/github-dark.css", () => ({}));
vi.mock("./themes/github.css", () => ({}));

// Import the SUT AFTER all mocks are registered.
import renderMarkdown from "./markdown";

describe("chat/markdown — renderMarkdown (real markdown-it)", () => {
  beforeEach(() => {
    // Reset localStorage to default (no theme → github-dark).
    vi.mocked(window.localStorage.getItem).mockImplementation(() => null);
  });

  // ── Newline collapsing ──────────────────────────────────────────────────
  describe("excessive newline collapsing", () => {
    it("collapses 3 consecutive newlines into exactly 2", () => {
      const out = renderMarkdown("para one\n\n\npara two");
      // The output must not contain 3+ consecutive newlines.
      expect(out).not.toMatch(/\n{3,}/);
      expect(out).toContain("para one");
      expect(out).toContain("para two");
    });

    it("collapses 5 consecutive newlines into exactly 2", () => {
      const out = renderMarkdown("a\n\n\n\n\nb");
      expect(out).not.toMatch(/\n{3,}/);
      expect(out).toContain("a");
      expect(out).toContain("b");
    });

    it("collapses 10+ consecutive newlines into exactly 2", () => {
      const out = renderMarkdown("start\n\n\n\n\n\n\n\n\n\n\nend");
      expect(out).not.toMatch(/\n{3,}/);
      expect(out).toContain("start");
      expect(out).toContain("end");
    });

    it("preserves exactly 2 newlines (no collapsing when already ≤ 2)", () => {
      const out = renderMarkdown("para one\n\npara two");
      // Two newlines should survive — the regex only targets 3+.
      expect(out).toContain("para one");
      expect(out).toContain("para two");
    });

    it("preserves single newlines within a paragraph", () => {
      const out = renderMarkdown("line1\nline2");
      expect(out).toContain("line1");
      expect(out).toContain("line2");
    });

    it("collapses newlines inside content that also has markdown", () => {
      const md = "# Title\n\n\n\n\n**bold** text";
      const out = renderMarkdown(md);
      expect(out).not.toMatch(/\n{3,}/);
      expect(out).toContain("Title");
      expect(out).toContain("bold");
    });
  });

  // ── HTML sanitization / escaping ────────────────────────────────────────
  describe("HTML sanitization (html: false)", () => {
    it("escapes <script> tags so they are not rendered as HTML elements", () => {
      const out = renderMarkdown("<script>alert(1)</script>");
      // The literal <script> tag must NOT appear as a real HTML element.
      expect(out).not.toMatch(/<script[^>]*>/);
      expect(out).not.toMatch(/<\/script>/);
      // The content is escaped so it shows as text.
      expect(out).toContain("&lt;script&gt;");
      expect(out).toContain("alert(1)");
    });

    it("escapes <script> with attributes", () => {
      const out = renderMarkdown(
        '<script type="text/javascript" src="evil.js"></script>',
      );
      expect(out).not.toMatch(/<script[^>]*>/);
      expect(out).toContain("&lt;script");
    });

    it("escapes <img> onerror XSS payloads", () => {
      const out = renderMarkdown(
        '<img src="x" onerror="alert(document.cookie)">',
      );
      expect(out).not.toMatch(/<img[^>]*onerror/);
      expect(out).toContain("&lt;img");
    });

    it("escapes <iframe> tags", () => {
      const out = renderMarkdown('<iframe src="https://evil.com"></iframe>');
      expect(out).not.toMatch(/<iframe[^>]*>/);
      expect(out).toContain("&lt;iframe");
    });

    it("escapes raw <div> tags when html is disabled", () => {
      const out = renderMarkdown("<div>raw content</div>");
      expect(out).not.toMatch(/<div[^>]*>raw content<\/div>/);
      expect(out).toContain("&lt;div&gt;");
    });

    it("does not execute or render inline event handlers", () => {
      const out = renderMarkdown('<p onclick="alert(1)">click me</p>');
      expect(out).not.toMatch(/<p[^>]*onclick/);
      expect(out).toContain("&lt;p");
    });

    it("still renders markdown syntax correctly alongside escaped HTML", () => {
      const out = renderMarkdown("<script>x</script> and **bold** text");
      expect(out).toContain("&lt;script&gt;");
      expect(out).toContain("bold");
      expect(out).not.toMatch(/<script[^>]*>/);
    });
  });

  // ── Empty string input ──────────────────────────────────────────────────
  describe("empty string input", () => {
    it("returns a string for empty input", () => {
      const out = renderMarkdown("");
      expect(typeof out).toBe("string");
    });

    it("returns a string for undefined input (default param)", () => {
      const out = renderMarkdown();
      expect(typeof out).toBe("string");
    });

    it("does not produce unexpected HTML elements for empty input", () => {
      const out = renderMarkdown("");
      // markdown-it renders empty input as an empty paragraph or empty string.
      // It must not contain script tags, iframes, or other dangerous elements.
      expect(out).not.toMatch(/<script/);
      expect(out).not.toMatch(/<iframe/);
      expect(out).not.toMatch(/<img/);
    });

    it("handles whitespace-only input without error", () => {
      const out = renderMarkdown("   \n\n  \n  ");
      expect(typeof out).toBe("string");
      expect(out).not.toMatch(/<script/);
    });
  });

  // ── Code blocks preserved ───────────────────────────────────────────────
  describe("fenced code blocks", () => {
    it("renders a fenced code block with a language", () => {
      const out = renderMarkdown("```js\nconst x = 1;\n```");
      expect(out).toContain("hljs");
      expect(out).toContain("<pre");
      expect(out).toContain("const x = 1;");
      expect(out).toContain("data-code-snippet");
    });

    it("renders a fenced code block without a language", () => {
      const out = renderMarkdown("```\nplain text\n```");
      expect(out).toContain("hljs");
      expect(out).toContain("<pre");
      expect(out).toContain("plain text");
    });

    it("preserves code block content with special characters", () => {
      const out = renderMarkdown("```\n<div> & <script>\n```");
      expect(out).toContain("<pre");
      // The code content must be HTML-encoded inside the <pre> block so
      // raw HTML is not rendered. markdown-it / he uses numeric character
      // references: &#x3C; for <, &#x3E; for >, &#x26; for &.
      expect(out).not.toMatch(/<pre[^>]*>[^<]*<div/);
      expect(out).toContain("&#x3C;div&#x3E;");
      expect(out).toContain("&#x3C;script&#x3E;");
    });

    it("preserves multi-line code blocks", () => {
      const code =
        "```python\ndef hello():\n    print('hi')\n    return 42\n```";
      const out = renderMarkdown(code);
      expect(out).toContain("<pre");
      expect(out).toContain("def hello");
      expect(out).toContain("print('hi')");
      expect(out).toContain("return 42");
    });

    it("includes the language label in the code block header", () => {
      const out = renderMarkdown("```js\nx\n```");
      expect(out).toContain("js");
    });

    it("preserves code blocks within surrounding markdown text", () => {
      const md = "Here is some code:\n\n```js\nconst y = 2;\n```\n\nDone.";
      const out = renderMarkdown(md);
      expect(out).toContain("Here is some code");
      expect(out).toContain("const y = 2;");
      expect(out).toContain("Done.");
      expect(out).toContain("<pre");
    });
  });

  // ── Basic markdown rendering ────────────────────────────────────────────
  describe("basic markdown rendering", () => {
    it("renders bold text with the custom strong class", () => {
      const out = renderMarkdown("**bold text**");
      expect(out).toContain('<strong class="text-white">bold text</strong>');
    });

    it("renders bold with underscore syntax", () => {
      const out = renderMarkdown("__bold text__");
      expect(out).toContain('<strong class="text-white">bold text</strong>');
    });

    it("renders links with target=_blank and rel=noopener noreferrer", () => {
      const out = renderMarkdown("[click here](https://example.com)");
      expect(out).toContain('href="https://example.com"');
      expect(out).toContain('target="_blank"');
      expect(out).toContain('rel="noopener noreferrer"');
    });

    it("renders all heading levels correctly", () => {
      expect(renderMarkdown("# H1")).toContain("<h1>H1</h1>");
      expect(renderMarkdown("## H2")).toContain("<h2>H2</h2>");
      expect(renderMarkdown("### H3")).toContain("<h3>H3</h3>");
      expect(renderMarkdown("#### H4")).toContain("<h4>H4</h4>");
      expect(renderMarkdown("##### H5")).toContain("<h5>H5</h5>");
      expect(renderMarkdown("###### H6")).toContain("<h6>H6</h6>");
    });

    it("renders a simple paragraph", () => {
      const out = renderMarkdown("hello world");
      expect(out).toContain("<p>hello world</p>");
    });

    it("renders inline code", () => {
      const out = renderMarkdown("use `npm test` to run tests");
      expect(out).toContain("<code>npm test</code>");
    });

    it("renders images with responsive classes", () => {
      const out = renderMarkdown("![alt text](https://example.com/img.png)");
      expect(out).toContain('src="https://example.com/img.png"');
      expect(out).toContain('alt="alt text"');
      expect(out).toContain('class="w-full h-auto"');
    });

    it("renders unordered lists", () => {
      const out = renderMarkdown("- item one\n- item two\n- item three");
      expect(out).toContain("<ul>");
      expect(out).toContain("item one");
      expect(out).toContain("item three");
    });

    it("renders ordered lists", () => {
      const out = renderMarkdown("1. first\n2. second\n3. third");
      expect(out).toContain("<ol>");
      expect(out).toContain("first");
      expect(out).toContain("third");
    });

    it("renders blockquotes", () => {
      const out = renderMarkdown("> This is a quote");
      expect(out).toContain("<blockquote>");
      expect(out).toContain("This is a quote");
    });

    it("HTML-encodes ampersands in link hrefs", () => {
      const out = renderMarkdown("[click](https://example.com/?a=1&b=2)");
      expect(out).toContain("https://example.com/?a=1&#x26;b=2");
    });
  });
});
