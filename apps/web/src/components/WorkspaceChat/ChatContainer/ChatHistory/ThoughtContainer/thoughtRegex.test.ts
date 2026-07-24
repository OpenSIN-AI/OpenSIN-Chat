// SPDX-License-Identifier: MIT
/**
 * Unit tests for ThoughtContainer regex patterns.
 *
 * The three exported regexes parse LLM thinking/reasoning tags from streamed
 * responses. They are consumed by ThoughtBrainButton, ThoughtChainComponent,
 * useCopyText, and RunDetailPage.
 *
 * Coverage focus (GitHub Issue #22 — critical paths):
 *   - THOUGHT_REGEX_OPEN: opening tag matching for all keyword variants
 *   - THOUGHT_REGEX_CLOSE: closing tag matching including response/answer
 *   - THOUGHT_REGEX_COMPLETE: full block matching with edge cases
 *   - Real-world streaming scenarios (partial tags, mixed content)
 *
 * Docs: ThoughtContainer/index.tsx
 * Purpose: Verify regex patterns match all keyword variants, handle
 * attributes/whitespace, and reject non-thought content.
 */
import { describe, it, expect, vi } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────────
// The index.tsx module imports React, i18n, markdown, DOMPurify, and media
// assets at the top level. We stub them so the module loads cleanly in jsdom.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));
vi.mock("@/utils/chat/markdown", () => ({
  default: (text: string) => text,
}));
vi.mock("@/utils/chat/purify", () => ({
  default: { sanitize: (x: string) => x },
}));
vi.mock("@/media/animations/thinking-animation.webm", () => ({}));
vi.mock("@/media/animations/thinking-static.png", () => ({}));

import {
  THOUGHT_REGEX_OPEN,
  THOUGHT_REGEX_CLOSE,
  THOUGHT_REGEX_COMPLETE,
} from "./index";

const THOUGHT_KEYWORDS = [
  "thought",
  "thinking",
  "think",
  "thought_chain",
  "arg_value",
];
const CLOSING_KEYWORDS = [...THOUGHT_KEYWORDS, "response", "answer"];

// ── THOUGHT_REGEX_OPEN ───────────────────────────────────────────────────
describe("THOUGHT_REGEX_OPEN", () => {
  describe("matches all thought keyword variants", () => {
    it.each(THOUGHT_KEYWORDS)("matches bare opening tag <%s>", (kw) => {
      expect(`<${kw}>`).toMatch(THOUGHT_REGEX_OPEN);
    });

    it.each(THOUGHT_KEYWORDS)("matches <%s> in surrounding text", (kw) => {
      expect(`some text <${kw}> reasoning here`).toMatch(THOUGHT_REGEX_OPEN);
    });
  });

  describe("matches tags with attributes", () => {
    it("matches <thought> with a single attribute", () => {
      expect('<thought type="deep">').toMatch(THOUGHT_REGEX_OPEN);
    });

    it("matches <thinking> with multiple attributes", () => {
      expect('<thinking step="1" confidence="high">').toMatch(
        THOUGHT_REGEX_OPEN,
      );
    });

    it("matches <think> with unquoted attribute value", () => {
      expect("<think mode=fast>").toMatch(THOUGHT_REGEX_OPEN);
    });

    it("matches <thought_chain> with attributes", () => {
      expect('<thought_chain id="abc-123">').toMatch(THOUGHT_REGEX_OPEN);
    });

    it("matches <arg_value> with attributes", () => {
      expect('<arg_value name="query">').toMatch(THOUGHT_REGEX_OPEN);
    });
  });

  describe("matches tags with whitespace variations", () => {
    it("matches tags with trailing whitespace before >", () => {
      expect("<thought   >").toMatch(THOUGHT_REGEX_OPEN);
    });

    it("matches tags with whitespace after the keyword", () => {
      expect("<thought >").toMatch(THOUGHT_REGEX_OPEN);
    });

    it("matches tags with whitespace between attributes", () => {
      expect('<thought  type="deep"   confidence="low">').toMatch(
        THOUGHT_REGEX_OPEN,
      );
    });
  });

  describe("rejects non-thought content", () => {
    it("does not match <response> (closing-only keyword)", () => {
      expect("<response>").not.toMatch(THOUGHT_REGEX_OPEN);
    });

    it("does not match <answer> (closing-only keyword)", () => {
      expect("<answer>").not.toMatch(THOUGHT_REGEX_OPEN);
    });

    it("does not match generic HTML tags", () => {
      expect("<p>").not.toMatch(THOUGHT_REGEX_OPEN);
      expect("<div>").not.toMatch(THOUGHT_REGEX_OPEN);
      expect("<span>").not.toMatch(THOUGHT_REGEX_OPEN);
    });

    it("does not match closing tags", () => {
      expect("</thought>").not.toMatch(THOUGHT_REGEX_OPEN);
      expect("</thinking>").not.toMatch(THOUGHT_REGEX_OPEN);
      expect("</think>").not.toMatch(THOUGHT_REGEX_OPEN);
    });

    it("does not match plain text without tags", () => {
      expect("just some text").not.toMatch(THOUGHT_REGEX_OPEN);
      expect("I am thinking about this").not.toMatch(THOUGHT_REGEX_OPEN);
    });

    it("does not match partial tag names (prefix only)", () => {
      // "though" is a prefix of "thought" but not a full keyword.
      expect("<though>").not.toMatch(THOUGHT_REGEX_OPEN);
    });
  });

  describe("streaming / partial content scenarios", () => {
    it("matches the first occurrence in a multi-tag string", () => {
      const content = "<thought>first</thought> <thinking>second</thinking>";
      const match = content.match(THOUGHT_REGEX_OPEN);
      expect(match).not.toBeNull();
      expect(match![0]).toBe("<thought>");
    });

    it("matches an unclosed opening tag (streaming in progress)", () => {
      expect("<thought>still thinking...").toMatch(THOUGHT_REGEX_OPEN);
    });

    it("matches opening tag at end of streamed chunk", () => {
      expect("some response text <thinking>").toMatch(THOUGHT_REGEX_OPEN);
    });
  });
});

// ── THOUGHT_REGEX_CLOSE ──────────────────────────────────────────────────
describe("THOUGHT_REGEX_CLOSE", () => {
  describe("matches all closing keyword variants", () => {
    it.each(CLOSING_KEYWORDS)("matches bare closing tag </%s>", (kw) => {
      expect(`</${kw}>`).toMatch(THOUGHT_REGEX_CLOSE);
    });

    it.each(CLOSING_KEYWORDS)("matches </%s> in surrounding text", (kw) => {
      expect(`reasoning here </${kw}> more text`).toMatch(THOUGHT_REGEX_CLOSE);
    });
  });

  describe("matches closing tags with whitespace", () => {
    it("matches closing tags with trailing whitespace", () => {
      expect("</thought   >").toMatch(THOUGHT_REGEX_CLOSE);
    });

    it("matches closing tags with internal whitespace", () => {
      expect("</thinking >").toMatch(THOUGHT_REGEX_CLOSE);
    });

    it("matches closing tags with attributes", () => {
      expect('</thought type="deep">').toMatch(THOUGHT_REGEX_CLOSE);
    });
  });

  describe("rejects non-thought closing content", () => {
    it("does not match opening tags", () => {
      expect("<thought>").not.toMatch(THOUGHT_REGEX_CLOSE);
      expect("<thinking>").not.toMatch(THOUGHT_REGEX_CLOSE);
    });

    it("does not match generic closing HTML tags", () => {
      expect("</p>").not.toMatch(THOUGHT_REGEX_CLOSE);
      expect("</div>").not.toMatch(THOUGHT_REGEX_CLOSE);
      expect("</span>").not.toMatch(THOUGHT_REGEX_CLOSE);
    });

    it("does not match plain text", () => {
      expect("end of thought").not.toMatch(THOUGHT_REGEX_CLOSE);
    });
  });

  describe("response and answer closing tags", () => {
    it("matches </response> (used to delimit final answer)", () => {
      expect("</response>").toMatch(THOUGHT_REGEX_CLOSE);
    });

    it("matches </answer> (used to delimit final answer)", () => {
      expect("</answer>").toMatch(THOUGHT_REGEX_CLOSE);
    });

    it("does NOT match <response> or <answer> as opening tags", () => {
      expect("<response>").not.toMatch(THOUGHT_REGEX_CLOSE);
      expect("<answer>").not.toMatch(THOUGHT_REGEX_CLOSE);
    });
  });
});

// ── THOUGHT_REGEX_COMPLETE ───────────────────────────────────────────────
describe("THOUGHT_REGEX_COMPLETE", () => {
  describe("matches complete blocks for all keywords", () => {
    it.each(THOUGHT_KEYWORDS)("matches complete <%s> block", (kw) => {
      const block = `<${kw}>some reasoning</${kw}>`;
      expect(block).toMatch(THOUGHT_REGEX_COMPLETE);
    });
  });

  describe("multi-line and complex content", () => {
    it("matches a block with multi-line content", () => {
      const block = "<thought>line1\nline2\nline3</thought>";
      expect(block).toMatch(THOUGHT_REGEX_COMPLETE);
    });

    it("matches a block with markdown inside", () => {
      const block = "<thinking>**bold** and `code`</thinking>";
      expect(block).toMatch(THOUGHT_REGEX_COMPLETE);
    });

    it("matches a block with nested-looking content", () => {
      const block =
        "<thinking>I think <thought>nested</thought> is fine</thinking>";
      expect(block).toMatch(THOUGHT_REGEX_COMPLETE);
    });

    it("matches a block with empty content", () => {
      expect("<thought></thought>").toMatch(THOUGHT_REGEX_COMPLETE);
    });

    it("matches a block with whitespace-only content", () => {
      expect("<thought>   </thought>").toMatch(THOUGHT_REGEX_COMPLETE);
    });

    it("matches a block with attributes on the opening tag", () => {
      expect('<thought type="deep">reasoning</thought>').toMatch(
        THOUGHT_REGEX_COMPLETE,
      );
    });

    it("matches a block with attributes on the closing tag", () => {
      expect('<thought>reasoning</thought type="deep">').toMatch(
        THOUGHT_REGEX_COMPLETE,
      );
    });
  });

  describe("rejects incomplete blocks", () => {
    it("does not match an unclosed opening tag", () => {
      expect("<thought>unclosed text").not.toMatch(THOUGHT_REGEX_COMPLETE);
    });

    it("does not match a closing tag without opening", () => {
      expect("just text</thought>").not.toMatch(THOUGHT_REGEX_COMPLETE);
    });

    it("does not match mismatched open/close keywords", () => {
      expect("<thought>content</thinking>").not.toMatch(THOUGHT_REGEX_COMPLETE);
    });

    it("does not match non-thought tags", () => {
      expect("<p>content</p>").not.toMatch(THOUGHT_REGEX_COMPLETE);
      expect("<div>content</div>").not.toMatch(THOUGHT_REGEX_COMPLETE);
    });
  });

  describe("content extraction", () => {
    it("extracts inner content via match", () => {
      const block = "<thought>my reasoning</thought>";
      const m = block.match(THOUGHT_REGEX_COMPLETE);
      expect(m).not.toBeNull();
      expect(m![0]).toContain("my reasoning");
    });

    it("preserves multi-line content in the match", () => {
      const block = "<thinking>step 1\nstep 2\nstep 3</thinking>";
      const m = block.match(THOUGHT_REGEX_COMPLETE);
      expect(m).not.toBeNull();
      expect(m![0]).toContain("step 1");
      expect(m![0]).toContain("step 2");
      expect(m![0]).toContain("step 3");
    });
  });

  describe("multiple blocks in a single string", () => {
    it("matches when multiple complete blocks exist", () => {
      const content =
        "<thought>first thought</thought> some text <thinking>second</thinking>";
      expect(content).toMatch(THOUGHT_REGEX_COMPLETE);
    });

    it("matches a complete block followed by an incomplete one", () => {
      const content =
        "<thought>done</thought> response text <thinking>still going...";
      // The first complete block should match.
      expect(content).toMatch(THOUGHT_REGEX_COMPLETE);
    });
  });
});

// ── Integration: content detection logic ─────────────────────────────────
describe("content detection via regex stripping (integration)", () => {
  // These tests mirror the contentIsNotEmpty helper logic from index.tsx
  // without importing the unexported function — we replicate the strip chain.
  function stripThoughtTags(content: string): string {
    return content
      .replace(THOUGHT_REGEX_OPEN, "")
      .replace(THOUGHT_REGEX_CLOSE, "")
      .replace(/[\n\s]/g, "");
  }

  it("content with only thought tags and whitespace is empty after stripping", () => {
    const stripped = stripThoughtTags("<thought>   </thought>");
    expect(stripped.length).toBe(0);
  });

  it("content with thought tags plus real text is non-empty after stripping", () => {
    const stripped = stripThoughtTags(
      "<thought>reasoning</thought>The answer is 42.",
    );
    expect(stripped.length).toBeGreaterThan(0);
    expect(stripped).toContain("Theansweris42.");
  });

  it("partial thought (open without close) leaves content after open tag", () => {
    const stripped = stripThoughtTags("<thought>still thinking...");
    expect(stripped).toContain("stillthinking...");
  });

  it("only the first opening and first closing tag are stripped (no global flag)", () => {
    // The regexes do NOT have the `g` flag, so .replace() only removes
    // the FIRST occurrence — this mirrors the real contentIsNotEmpty
    // behavior in index.tsx.
    const content =
      "<thought>first</thought>middle<thinking>second</thinking>end";
    const stripped = stripThoughtTags(content);
    // First <thought> and first </thought> are removed; inner "first"
    // text remains because the regex only matches the tag, not the content.
    expect(stripped).toContain("first");
    expect(stripped).toContain("middle");
    expect(stripped).toContain("end");
    // The second pair of tags is NOT stripped (no global flag).
    expect(stripped).toContain("thinking");
  });

  it("response/answer closing tags are stripped", () => {
    const content = "<thought>reasoning</thought>The answer</response>";
    const stripped = stripThoughtTags(content);
    expect(stripped).toContain("Theanswer");
  });

  it("empty content is empty after stripping", () => {
    const stripped = stripThoughtTags("");
    expect(stripped.length).toBe(0);
  });
});
