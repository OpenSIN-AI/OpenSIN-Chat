// SPDX-License-Identifier: MIT
import MarkdownIt from "markdown-it";
import katex from "katex";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/logger", () => ({
  default: { error: vi.fn() },
}));

import logger from "@/utils/logger";
import mathPlugin from "./markdown-katex";

function renderer(options: Record<string, unknown> = {}) {
  const md = new MarkdownIt({ html: false });
  md.use(mathPlugin, options);
  return { md, options };
}

describe("markdown KaTeX plugin", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("applies secure defaults and renders dollar inline math", () => {
    const { md, options } = renderer();
    const html = md.render("Before $x^2 + y^2$ after");

    expect(options).toMatchObject({
      throwOnError: false,
      trust: false,
      strict: "ignore",
      displayMode: false,
    });
    expect(html).toContain('class="katex"');
    expect(html).toContain("Before");
    expect(html).toContain("after");
  });

  it("preserves explicit options and renders parenthesized inline math", () => {
    const options = { throwOnError: true, trust: true, strict: "warn" };
    const { md } = renderer(options);
    const html = md.render(String.raw`Value \(a+b\) done`);

    expect(options).toMatchObject({
      throwOnError: true,
      trust: true,
      strict: "warn",
      displayMode: false,
    });
    expect(html).toContain('class="katex"');
  });

  it.each([
    ["single-line dollars", "$$x+y$$"],
    ["multi-line dollars", "$$\nx+y\n$$"],
    ["single-line brackets", String.raw`\[x+y\]`],
    ["multi-line brackets", String.raw`\[\nx+y\n\]`],
  ])("renders %s as display math", (_label, source) => {
    const { md, options } = renderer();
    const html = md.render(source);

    expect(html).toContain('class="katex-display"');
    expect(options.displayMode).toBe(true);
  });

  it("does not treat ordinary dollars, whitespace delimiters, or empty pairs as math", () => {
    const { md } = renderer();
    const html = md.render("Price $5 and $ spaced$ plus $$ and lone $tail");

    expect(html).toContain("Price $5");
    expect(html).toContain("$ spaced$");
    expect(html).toContain("$$");
    expect(html).toContain("$tail");
  });

  it("skips escaped closing delimiters and finds the next real delimiter", () => {
    const { md } = renderer();
    const html = md.render(String.raw`$a\\$b$`);

    expect(html).toContain('class="katex"');
  });

  it("leaves unmatched parenthesized delimiters readable", () => {
    const { md } = renderer();
    const html = md.render(String.raw`prefix \(x + y`);

    expect(html).toContain("prefix");
    expect(html).not.toContain('class="katex"');
  });

  it("stops an unterminated block at the document end", () => {
    const { md } = renderer();
    const html = md.render("$$\nx+y");

    expect(html).toContain('class="katex-display"');
  });

  it("escapes inline source when KaTeX rendering throws", () => {
    vi.spyOn(katex, "renderToString").mockImplementation(() => {
      throw new Error("inline boom");
    });
    const { md } = renderer({ throwOnError: true });
    const html = md.render(`$<&\"' >$`);

    expect(logger.error).toHaveBeenCalledWith(
      "KaTeX inline render error:",
      expect.any(Error),
    );
    expect(html).toContain("katex-error");
    expect(html).toContain("&lt;&amp;&quot;&#39; &gt;");
  });

  it("escapes block source when KaTeX rendering throws", () => {
    vi.spyOn(katex, "renderToString").mockImplementation(() => {
      throw new Error("block boom");
    });
    const { md } = renderer({ throwOnError: true });
    const html = md.render("$$<&\"'>$$");

    expect(logger.error).toHaveBeenCalledWith(
      "KaTeX block render error:",
      expect.any(Error),
    );
    expect(html).toContain("katex-error");
    expect(html).toContain("&lt;&amp;&quot;&#39;&gt;");
  });
});
