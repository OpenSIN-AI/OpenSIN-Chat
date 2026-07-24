// SPDX-License-Identifier: MIT
/**
 * Tests for ThoughtContainer regex patterns and content detection logic.
 *
 * These regexes parse LLM thinking tags from streamed responses.
 * They are consumed by ThoughtBrainButton, ThoughtChainComponent,
 * useCopyText, and RunDetailPage.
 *
 * Docs: ThoughtContainer/index.tsx
 * Purpose: Verify regex patterns match all keyword variants and reject non-thought content.
 */
import { describe, it, expect, vi } from "vitest";

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

const KEYWORDS = ["thought", "thinking", "think", "thought_chain", "arg_value"];

describe("ThoughtContainer regex patterns", () => {
  describe("THOUGHT_REGEX_OPEN", () => {
    it.each(KEYWORDS)("matches the opening tag for keyword: %s", (kw) => {
      const tag = "<" + kw + ">";
      expect(tag).toMatch(THOUGHT_REGEX_OPEN);
    });

    it("matches opening tags with attributes", () => {
      expect('<thought type="deep">').toMatch(THOUGHT_REGEX_OPEN);
      expect('<thinking step="1">').toMatch(THOUGHT_REGEX_OPEN);
    });

    it("matches opening tags with extra whitespace", () => {
      expect("<thought   >").toMatch(THOUGHT_REGEX_OPEN);
    });

    it("does not match non-thought tags", () => {
      expect("<response>").not.toMatch(THOUGHT_REGEX_OPEN);
      expect("<answer>").not.toMatch(THOUGHT_REGEX_OPEN);
      expect("<p>").not.toMatch(THOUGHT_REGEX_OPEN);
    });

    it("does not match closing tags", () => {
      expect("</thought>").not.toMatch(THOUGHT_REGEX_OPEN);
      expect("</thinking>").not.toMatch(THOUGHT_REGEX_OPEN);
    });
  });

  describe("THOUGHT_REGEX_CLOSE", () => {
    const CLOSING = [...KEYWORDS, "response", "answer"];

    it.each(CLOSING)("matches the closing tag for keyword: %s", (kw) => {
      const tag = "</" + kw + ">";
      expect(tag).toMatch(THOUGHT_REGEX_CLOSE);
    });

    it("matches closing tags with extra whitespace", () => {
      expect("</thought   >").toMatch(THOUGHT_REGEX_CLOSE);
    });

    it("does not match opening tags", () => {
      expect("<thought>").not.toMatch(THOUGHT_REGEX_CLOSE);
    });

    it("does not match non-thought closing tags", () => {
      expect("</p>").not.toMatch(THOUGHT_REGEX_CLOSE);
      expect("</div>").not.toMatch(THOUGHT_REGEX_CLOSE);
    });
  });

  describe("THOUGHT_REGEX_COMPLETE", () => {
    it.each(KEYWORDS)("matches a complete block for keyword: %s", (kw) => {
      const block = "<" + kw + ">some reasoning here</" + kw + ">";
      expect(block).toMatch(THOUGHT_REGEX_COMPLETE);
    });

    it("matches a block with multi-line content", () => {
      const block = "<thought>line1\nline2\nline3</thought>";
      expect(block).toMatch(THOUGHT_REGEX_COMPLETE);
    });

    it("matches a block with nested-like content", () => {
      const block =
        "<thinking>I think <thought>nested</thought> is fine</thinking>";
      expect(block).toMatch(THOUGHT_REGEX_COMPLETE);
    });

    it("does not match an unclosed block", () => {
      expect("<thought>unclosed text").not.toMatch(THOUGHT_REGEX_COMPLETE);
    });

    it("does not match a block with only closing tag", () => {
      expect("just text</thought>").not.toMatch(THOUGHT_REGEX_COMPLETE);
    });

    it("extracts the inner content via match", () => {
      const block = "<thought>my reasoning</thought>";
      const m = block.match(THOUGHT_REGEX_COMPLETE);
      expect(m).not.toBeNull();
      expect(m![0]).toContain("my reasoning");
    });
  });

  describe("content detection via regexes", () => {
    it("content with only thought tags and whitespace is effectively empty", () => {
      const content = "<thought>   </thought>";
      const stripped = content
        .replace(THOUGHT_REGEX_OPEN, "")
        .replace(THOUGHT_REGEX_CLOSE, "")
        .replace(/[\n\s]/g, "");
      expect(stripped.length).toBe(0);
    });

    it("content with thought tags plus real text is non-empty", () => {
      const content = "<thought>reasoning</thought>The answer is 42.";
      const stripped = content
        .replace(THOUGHT_REGEX_OPEN, "")
        .replace(THOUGHT_REGEX_CLOSE, "")
        .replace(/[\n\s]/g, "");
      expect(stripped.length).toBeGreaterThan(0);
      expect(stripped).toContain("Theansweris42.");
    });

    it("partial thought (open without close) leaves content after open tag", () => {
      const content = "<thought>still thinking...";
      const stripped = content
        .replace(THOUGHT_REGEX_OPEN, "")
        .replace(THOUGHT_REGEX_CLOSE, "")
        .replace(/[\n\s]/g, "");
      expect(stripped).toContain("stillthinking...");
    });
  });
});
