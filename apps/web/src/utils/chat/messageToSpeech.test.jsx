// SPDX-License-Identifier: MIT
import { describe, it, expect } from "vitest";

import messageToSpeech from "./messageToSpeech";

describe("chat/messageToSpeech", () => {
  describe("input handling", () => {
    it("returns an empty string for an empty string", () => {
      expect(messageToSpeech("")).toBe("");
    });

    it("returns an empty string for undefined", () => {
      expect(messageToSpeech(undefined)).toBe("");
    });

    it("returns an empty string for null", () => {
      expect(messageToSpeech(null)).toBe("");
    });

    it("returns an empty string for non-string input (number)", () => {
      expect(messageToSpeech(42)).toBe("");
    });

    it("returns an empty string for non-string input (object)", () => {
      expect(messageToSpeech({ a: 1 })).toBe("");
    });

    it("accepts a call with no argument", () => {
      expect(messageToSpeech()).toBe("");
    });
  });

  describe("thought / reasoning block stripping", () => {
    it("strips complete <thinking>...</thinking> blocks", () => {
      const out = messageToSpeech("<thinking>secret</thinking>hello");
      expect(out).toBe("hello");
      expect(out).not.toContain("secret");
    });

    it("strips complete <think>...</think> blocks", () => {
      const out = messageToSpeech("<think>reasoning</think>spoken");
      expect(out).toBe("spoken");
    });

    it("strips complete <thought>...</thought> blocks", () => {
      const out = messageToSpeech("<thought>inner</thought>visible");
      expect(out).toBe("visible");
    });

    it("strips complete <thought_chain>...</thought_chain> blocks", () => {
      const out = messageToSpeech(
        "<thought_chain>chain of thought</thought_chain>final",
      );
      expect(out).toBe("final");
    });

    it("strips unclosed <thinking> tags and everything after them", () => {
      const out = messageToSpeech("before<thinking>never closes here");
      // The unclosed opening tag and all subsequent content should be dropped.
      expect(out).toBe("before");
    });

    it("tolerates attributes on thought tags", () => {
      const out = messageToSpeech(
        '<thinking attr="value">hidden</thinking>shown',
      );
      expect(out).toBe("shown");
    });
  });

  describe("code block handling", () => {
    it("removes fenced ```code``` blocks entirely", () => {
      const out = messageToSpeech("hello\n```js\nconst x = 1;\n```\nworld");
      expect(out).not.toContain("const");
      expect(out).not.toContain("```");
      expect(out).toContain("hello");
      expect(out).toContain("world");
    });

    it("removes ~~~ code fences", () => {
      const out = messageToSpeech("a ~~~raw~~~ b");
      expect(out).not.toContain("~~~");
      expect(out).not.toContain("raw");
    });

    it("strips inline code backticks but keeps the content", () => {
      const out = messageToSpeech("run `npm test` now");
      expect(out).toBe("run npm test now");
    });
  });

  describe("image and link handling", () => {
    it("removes markdown images entirely", () => {
      const out = messageToSpeech("see ![alt](https://e.com/i.png) here");
      expect(out).not.toContain("alt");
      expect(out).not.toContain("https://e.com");
      expect(out).toContain("see");
      expect(out).toContain("here");
    });

    it("keeps link label, drops the URL", () => {
      const out = messageToSpeech("click [here](https://example.com) please");
      expect(out).toBe("click here please");
    });

    it("removes reference-style link definitions", () => {
      const out = messageToSpeech('Hello\n[ref]: https://example.com "title"');
      expect(out).not.toContain("ref");
      expect(out).not.toContain("https://example.com");
    });
  });

  describe("structural markers", () => {
    it("drops heading markers but keeps the text", () => {
      expect(messageToSpeech("# Heading")).toBe("Heading");
      expect(messageToSpeech("### Sub")).toBe("Sub");
    });

    it("drops blockquote markers", () => {
      expect(messageToSpeech("> quoted text")).toBe("quoted text");
    });

    it("drops unordered list markers (-, *, +)", () => {
      expect(messageToSpeech("- one\n* two\n+ three")).toBe("one two three");
    });

    it("drops ordered list markers", () => {
      expect(messageToSpeech("1. first\n2) second")).toBe("first second");
    });

    it("removes horizontal rules", () => {
      expect(messageToSpeech("a\n\n---\n\nb")).toBe("a b");
    });
  });

  describe("emphasis markers", () => {
    it("strips bold (**)", () => {
      expect(messageToSpeech("this is **bold** text")).toBe(
        "this is bold text",
      );
    });

    it("strips bold (__)", () => {
      expect(messageToSpeech("this is __bold__ text")).toBe(
        "this is bold text",
      );
    });

    it("strips italic (*)", () => {
      expect(messageToSpeech("an *italic* word")).toBe("an italic word");
    });

    it("strips italic (_)", () => {
      expect(messageToSpeech("an _italic_ word")).toBe("an italic word");
    });

    it("strips triple emphasis (***text***)", () => {
      expect(messageToSpeech("***all***")).toBe("all");
    });

    it("strips strikethrough (~~)", () => {
      expect(messageToSpeech("~~old~~ new")).toBe("old new");
    });
  });

  describe("tables", () => {
    it("removes the alignment row and converts pipes to commas", () => {
      const md = "| a | b |\n|---|---|\n| 1 | 2 |";
      const out = messageToSpeech(md);
      expect(out).not.toContain("|");
      expect(out).not.toContain("---");
      expect(out).toContain("a");
      expect(out).toContain("b");
    });
  });

  describe("HTML and whitespace", () => {
    it("strips HTML tags but keeps their content", () => {
      const out = messageToSpeech("<b>bold</b> and <i>italic</i>");
      expect(out).toBe("bold and italic");
    });

    it("collapses repeated whitespace to a single space", () => {
      const out = messageToSpeech("hello\n\n  world\t\t!");
      expect(out).toBe("hello world !");
    });

    it("trims leading and trailing whitespace", () => {
      expect(messageToSpeech("   hello   ")).toBe("hello");
    });
  });

  describe("response/answer wrappers", () => {
    it("removes <response> wrappers but keeps inner content", () => {
      const out = messageToSpeech("<response>the answer</response>");
      expect(out).toBe("the answer");
    });

    it("removes <answer> wrappers but keeps inner content", () => {
      const out = messageToSpeech("<answer>42</answer>");
      expect(out).toBe("42");
    });
  });

  describe("realistic mixed input", () => {
    it("handles a Markdown message with multiple constructs", () => {
      const input = [
        "<thinking>don't read this</thinking>",
        "# Title",
        "Hello **world**!",
        "",
        "- item 1",
        "- item 2",
        "",
        "see [docs](https://example.com).",
        "",
        "```js",
        "console.log('skip me');",
        "```",
        "",
        "Use `npm test` to run.",
      ].join("\n");

      const out = messageToSpeech(input);

      expect(out).not.toContain("don't read this");
      expect(out).not.toContain("console.log");
      expect(out).not.toContain("https://example.com");
      expect(out).toContain("Title");
      expect(out).toContain("Hello world!");
      expect(out).toContain("item 1");
      expect(out).toContain("item 2");
      expect(out).toContain("docs");
      expect(out).toContain("npm test");
      // No leftover markdown punctuation:
      expect(out).not.toMatch(/[*_~`]/);
    });
  });
});
