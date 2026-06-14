// SPDX-License-Identifier: MIT
import { describe, it, expect, vi } from "vitest";

vi.mock("katex", () => ({
  default: { renderToString: (s) => `<span class="katex">${s}</span>` },
}));
vi.mock("@/models/appearance", () => ({
  default: { get: (key) => (key === "renderHTML" ? false : undefined) },
}));
vi.mock("uuid", () => ({ v4: () => "test-uuid" }));
vi.mock("highlight.js", () => {
  const hljs = {
    registerLanguage: vi.fn(),
    getLanguage: vi.fn((lang) =>
      lang === "svelte" || lang === "js" ? {} : null,
    ),
    highlight: (code, opts) => ({
      value: `<span class="hljs">${code}</span>`,
      language: opts?.language,
    }),
  };
  return { default: hljs, ...hljs };
});
vi.mock("./hljs-libraries/svelte", () => ({ default: {} }));

import renderMarkdown from "./markdown";

describe("chat/markdown – real markdown-it renderer", () => {
  it("renders a paragraph", () => {
    const out = renderMarkdown("hello world");
    expect(out).toContain("<p>hello world</p>");
  });

  it("wraps bold in text-white class", () => {
    const out = renderMarkdown("**bold**");
    expect(out).toContain('<strong class="text-white">bold</strong>');
  });

  it("renders links with target and rel", () => {
    const out = renderMarkdown("[click](https://example.com)");
    expect(out).toContain('href="https://example.com"');
    expect(out).toContain('target="_blank"');
    expect(out).toContain('rel="noopener noreferrer"');
  });

  it("renders images responsively", () => {
    const out = renderMarkdown("![alt text](https://example.com/img.png)");
    expect(out).toContain('src="https://example.com/img.png"');
    expect(out).toContain('alt="alt text"');
    expect(out).toContain('class="w-full h-auto"');
  });

  it("highlights known languages in code blocks", () => {
    const out = renderMarkdown("```js\nconst x = 1;\n```");
    expect(out).toContain("hljs");
    expect(out).toContain("test-uuid");
    expect(out).toContain("js");
  });

  it("falls back to plain text for unknown languages", () => {
    const out = renderMarkdown("```unknown\nfoo\n```");
    expect(out).toContain("hljs");
    expect(out).toContain("foo");
  });

  it("selects the light theme when localStorage is light", () => {
    window.localStorage.getItem.mockImplementation((key) =>
      key === "theme" ? "light" : null,
    );
    const out = renderMarkdown("```js\nx\n```");
    expect(out).toContain("hljs");
  });
});
