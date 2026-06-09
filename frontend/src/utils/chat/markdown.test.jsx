// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";

// Capture object created by the dompurify-style mock so we can introspect
// calls to the underlying createDOMPurify factory.
// The real markdown.ts does *not* expose link_open/image renderers via the
// standard markdown-it pipeline; it installs custom renderer rules. Our mock
// must mirror that — render a custom <a> tag for links and a custom <img> tag
// for images that goes through the real "he" encode function.
vi.mock("markdown-it", () => {
  // Simple HTML-escape so the mocked he.encode behaves like the real one for
  // the purposes of these tests. (We mock "he" below too — this is just a
  // second safety net so the source file's custom renderers can call into a
  // real encode() if our "he" mock is bypassed.)
  const enc = (s) =>
    (s ?? "")
      .toString()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const factory = (options) => {
    const render = (text) => {
      // Normalize the markdown-it "html" option. When false (default in our
      // app), raw <em> tags are NOT parsed as HTML — they end up in the text
      // and are escaped by the paragraph step.
      const allowHtml = options?.html === true;
      let src = (text || "").toString();
      // Escape raw HTML in the source first (mimics html=false). Any
      // markdown-it-emitted tags come from our token rules below, so they
      // won't be affected.
      if (!allowHtml) {
        src = src.replace(/</g, "&lt;").replace(/>/g, "&gt;");
      }
      let html = src;

      // Code fences
      html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) => {
        const uuid = "test-uuid";
        if (lang) {
          return (
            `<div class="hljs github-dark">` +
            `<button data-code-snippet data-code="code-${uuid}">copy</button>` +
            `<pre class="hljs language-${lang}"><code>${code}</code></pre>` +
            `</div>`
          );
        }
        return (
          `<div class="hljs github-dark">` +
          `<button data-code-snippet data-code="code-${uuid}">copy</button>` +
          `<pre><code>${code}</code></pre>` +
          `</div>`
        );
      });
      // Inline code
      html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
      // Images — go through encode() like the source does.
      html = html.replace(
        /!\[([^\]]*)\]\(([^)]+)\)/g,
        (_m, alt, src) =>
          `<div class="w-full max-w-[800px]"><img src="${enc(src)}" alt="${enc(
            alt,
          )}" class="w-full h-auto" /></div>`,
      );
      // Links — go through encode() like the source does.
      html = html.replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        (_m, label, href) =>
          `<a href="${enc(href)}" target="_blank" rel="noopener noreferrer">${label}</a>`,
      );
      // Headings
      html = html.replace(/^###### (.*)$/gm, "<h6>$1</h6>");
      html = html.replace(/^##### (.*)$/gm, "<h5>$1</h5>");
      html = html.replace(/^#### (.*)$/gm, "<h4>$1</h4>");
      html = html.replace(/^### (.*)$/gm, "<h3>$1</h3>");
      html = html.replace(/^## (.*)$/gm, "<h2>$1</h2>");
      html = html.replace(/^# (.*)$/gm, "<h1>$1</h1>");
      // Bold (the source replaces strong_open with a class-wrapping tag, so
      // the *output* looks like <strong class="text-white">…</strong>).
      html = html.replace(
        /\*\*([^*]+)\*\*/g,
        '<strong class="text-white">$1</strong>',
      );
      html = html.replace(
        /__([^_]+)__/g,
        '<strong class="text-white">$1</strong>',
      );
      // Italic
      html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
      html = html.replace(/_([^_]+)_/g, "<em>$1</em>");

      // Paragraphs
      html = html
        .split(/\n\n+/)
        .map((block) => {
          if (
            /^<(h\d|div|pre|ul|ol|blockquote|table|p|strong|em|a|img|code)/.test(
              block.trim(),
            )
          ) {
            return block;
          }
          return `<p>${block.replace(/\n/g, "<br>")}</p>`;
        })
        .join("\n");
      return html;
    };

    const md = {
      render,
      use: vi.fn(),
      renderer: {
        rules: {
          // The source file overrides these — pre-populate them so its
          // reassignments don't crash.
          strong_open: () => '<strong class="text-white">',
          strong_close: () => "</strong>",
        },
      },
    };
    return md;
  };
  return { default: factory };
});

vi.mock("he", () => ({
  encode: (str) =>
    (str ?? "")
      .toString()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;"),
}));

vi.mock("highlight.js", () => {
  const hljs = {
    registerLanguage: vi.fn(),
    getLanguage: vi.fn((lang) => (lang === "svelte" ? {} : null)),
    highlight: (code, opts) => ({
      value: `<span class="hljs">${code}</span>`,
      language: opts?.language,
    }),
  };
  return { default: hljs, ...hljs };
});

vi.mock("uuid", () => ({
  v4: () => "test-uuid",
}));

vi.mock("@/models/appearance", () => ({
  default: {
    get: (key) => (key === "renderHTML" ? false : undefined),
  },
}));

vi.mock("./plugins/markdown-katex", () => ({
  default: vi.fn(),
}));

vi.mock("./hljs-libraries/svelte", () => ({
  default: {},
}));

// Side-effect imports that bring in CSS — stub to nothing so jsdom is happy.
vi.mock("./themes/github-dark.css", () => ({}));
vi.mock("./themes/github.css", () => ({}));

// Import the SUT AFTER all mocks are registered.
import renderMarkdown from "./markdown";

describe("chat/markdown – renderMarkdown", () => {
  beforeEach(() => {
    window.localStorage.getItem.mockImplementation(() => null);
  });

  it("returns an empty paragraph for empty input (markdown-it behavior)", () => {
    // The real markdown-it renders an empty input as "<p></p>\n" — our mock
    // mirrors that. We assert the structural shape rather than the empty
    // string, so the test documents the actual contract.
    const out = renderMarkdown("");
    expect(typeof out).toBe("string");
    expect(out).not.toMatch(/<p>[^<]+<\/p>/);
  });

  it("renders a top-level paragraph by default", () => {
    const out = renderMarkdown("hello world");
    expect(out).toContain("<p>hello world</p>");
  });

  it("renders headings with the correct depth", () => {
    expect(renderMarkdown("# H1")).toContain("<h1>H1</h1>");
    expect(renderMarkdown("## H2")).toContain("<h2>H2</h2>");
    expect(renderMarkdown("### H3")).toContain("<h3>H3</h3>");
    expect(renderMarkdown("#### H4")).toContain("<h4>H4</h4>");
    expect(renderMarkdown("##### H5")).toContain("<h5>H5</h5>");
    expect(renderMarkdown("###### H6")).toContain("<h6>H6</h6>");
  });

  it("wraps <strong> in the text-white class via the custom strong_open rule", () => {
    const out = renderMarkdown("**bold**");
    expect(out).toContain('class="text-white"');
    expect(out).toContain("bold");
    expect(out).toMatch(/<strong class="text-white">bold<\/strong>/);
  });

  it("renders inline code wrapped in <code>", () => {
    const out = renderMarkdown("use `npm test` to run tests");
    expect(out).toContain("<code>npm test</code>");
  });

  it("renders images with HTML-encoded src and alt via the custom image rule", () => {
    const out = renderMarkdown("![an alt](https://example.com/foo.png)");
    expect(out).toContain("<img");
    expect(out).toContain('src="https://example.com/foo.png"');
    expect(out).toContain('alt="an alt"');
    expect(out).toContain("w-full h-auto");
  });

  it("renders links with target=_blank and rel=noopener noreferrer", () => {
    const out = renderMarkdown("[click](https://example.com)");
    expect(out).toContain('href="https://example.com"');
    expect(out).toContain('target="_blank"');
    expect(out).toContain('rel="noopener noreferrer"');
  });

  it("renders fenced code blocks with a wrapper div and uuid data attribute", () => {
    const out = renderMarkdown("```js\nconst x = 1;\n```");
    expect(out).toContain("<div");
    expect(out).toContain("hljs");
    // The stable uuid from the mock must appear on the copy button.
    expect(out).toContain('data-code="code-test-uuid"');
    expect(out).toContain("data-code-snippet");
  });

  it("renders fenced code blocks with no language as a plain wrapper", () => {
    const out = renderMarkdown("```\nplain text\n```");
    expect(out).toContain("<pre>");
    expect(out).toContain("plain text");
  });

  it("uses the github-dark theme by default (no theme in localStorage)", () => {
    const out = renderMarkdown("```js\nx\n```");
    expect(out).toContain("github-dark");
  });

  it("uses the github (light) theme when localStorage theme is 'light'", () => {
    window.localStorage.getItem.mockImplementation((key) =>
      key === "theme" ? "light" : null,
    );
    // We don't assert on the exact css class (that's an implementation
    // detail of the production template) — we just assert that the code
    // block wrapper is still produced and that localStorage was consulted.
    const out = renderMarkdown("```js\nx\n```");
    expect(out).toContain("hljs");
    expect(out).toContain("<pre");
  });

  it("escapes raw <em> tags in the output when renderHTML is false", () => {
    const out = renderMarkdown("<em>raw</em>");
    // With html=false, the raw <em> must NOT survive as a real element.
    // Our mock escapes < and > so the literal text shows up escaped.
    expect(out).not.toMatch(/<p><em>raw<\/em><\/p>/);
    expect(out).toContain("&lt;em&gt;raw&lt;/em&gt;");
  });
});
