// SPDX-License-Identifier: MIT
/* eslint-env jest */

const {
  escapeHTML,
  markdownToTelegram,
} = require("../../../utils/telegramBot/utils/format");

describe("escapeHTML", () => {
  test("escapes &, <, > characters", () => {
    expect(escapeHTML("a&b<c>d")).toBe("a&amp;b&lt;c&gt;d");
  });

  test("leaves normal text unchanged", () => {
    expect(escapeHTML("hello world")).toBe("hello world");
  });
});

describe("markdownToTelegram", () => {
  test("returns empty string for empty input", () => {
    expect(markdownToTelegram("")).toBe("");
  });

  test("returns empty string for null input", () => {
    expect(markdownToTelegram(null)).toBe("");
  });

  test("returns empty string for undefined input", () => {
    expect(markdownToTelegram(undefined)).toBe("");
  });

  test("converts bold text **hello** to <b>hello</b>", () => {
    expect(markdownToTelegram("**hello**")).toBe("<b>hello</b>");
  });

  test("converts bold text __hello__ to <b>hello</b>", () => {
    expect(markdownToTelegram("__hello__")).toBe("<b>hello</b>");
  });

  test("converts italic text *hello* to <i>hello</i>", () => {
    expect(markdownToTelegram("*hello*")).toBe("<i>hello</i>");
  });

  test("converts italic text _hello_ to <i>hello</i>", () => {
    expect(markdownToTelegram("_hello_")).toBe("<i>hello</i>");
  });

  test("converts strikethrough ~~hello~~ to <s>hello</s>", () => {
    expect(markdownToTelegram("~~hello~~")).toBe("<s>hello</s>");
  });

  test("converts inline code `code` to <code>code</code>", () => {
    expect(markdownToTelegram("`code`")).toBe("<code>code</code>");
  });

  test("converts fenced code block with language", () => {
    const input = "```js\nconst x = 1;\n```";
    const result = markdownToTelegram(input);
    expect(result).toBe("<pre>const x = 1;</pre>");
  });

  test("converts fenced code block without language", () => {
    const input = "```\nplain code\n```";
    const result = markdownToTelegram(input);
    expect(result).toBe("<pre>plain code</pre>");
  });

  test("escapes HTML inside code blocks", () => {
    const input = "```html\n<div>\n```";
    const result = markdownToTelegram(input);
    expect(result).toBe("<pre>&lt;div&gt;</pre>");
  });

  test("converts link [text](url) to <a> tag", () => {
    expect(markdownToTelegram("[text](https://example.com)")).toBe(
      '<a href="https://example.com">text</a>',
    );
  });

  test("converts header # Title to <b>Title</b>", () => {
    expect(markdownToTelegram("# Title")).toBe("<b>Title</b>");
  });

  test("converts header ## Subtitle to <b>Subtitle</b>", () => {
    expect(markdownToTelegram("## Subtitle")).toBe("<b>Subtitle</b>");
  });

  test("converts list items - item to bullet", () => {
    expect(markdownToTelegram("- item")).toBe("• item");
  });

  test("converts list items * item to bullet", () => {
    expect(markdownToTelegram("* item")).toBe("• item");
  });

  test("escapes HTML by default", () => {
    expect(markdownToTelegram("<script>alert(1)</script>")).toBe(
      "&lt;script&gt;alert(1)&lt;/script&gt;",
    );
  });

  test("escapes & character in text", () => {
    expect(markdownToTelegram("Tom & Jerry")).toBe("Tom &amp; Jerry");
  });

  test("skips HTML escaping when escapeHtml is false", () => {
    const result = markdownToTelegram("<b>hello</b>", { escapeHtml: false });
    expect(result).toBe("<b>hello</b>");
  });

  test("closes unclosed tags when closeUnclosedTags is true", () => {
    const result = markdownToTelegram("<b>unclosed", {
      escapeHtml: false,
      closeUnclosedTags: true,
    });
    expect(result).toBe("<b>unclosed</b>");
  });

  test("does not close unclosed tags when closeUnclosedTags is false", () => {
    const result = markdownToTelegram("<b>unclosed", {
      escapeHtml: false,
      closeUnclosedTags: false,
    });
    expect(result).toBe("<b>unclosed");
  });

  test("closes multiple unclosed tags in reverse order", () => {
    const result = markdownToTelegram("<b><i>text", {
      escapeHtml: false,
      closeUnclosedTags: true,
    });
    expect(result).toBe("<b><i>text</i></b>");
  });

  test("converts complete think block to blockquote", () => {
    const result = markdownToTelegram("<think>short thought</think>");
    expect(result).toBe(
      "<blockquote>💭 <b>Thinking:</b>\nshort thought</blockquote>",
    );
  });

  test("converts long think content to blockquote expandable", () => {
    const longContent = "a".repeat(201);
    const result = markdownToTelegram(`<think>${longContent}</think>`);
    expect(result).toBe(
      `<blockquote expandable>💭 <b>Thinking:</b>\n${longContent}</blockquote>`,
    );
  });

  test("escapes HTML inside think block content", () => {
    const result = markdownToTelegram("<think><script></think>");
    expect(result).toContain("&lt;script&gt;");
  });

  test("converts blockquote > text to italic", () => {
    expect(markdownToTelegram("> quoted text")).toBe("<i>quoted text</i>");
  });

  test("converts markdown table to preformatted", () => {
    const input = "| Name | Age |\n| --- | --- |\n| Alice | 30 |";
    const result = markdownToTelegram(input);
    expect(result).toContain("<pre>");
    expect(result).toContain("Alice");
    expect(result).toContain("30");
  });
});
