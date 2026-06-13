// SPDX-License-Identifier: MIT
import { describe, it, expect, vi } from "vitest";
import { copyMarkdownAsRichText } from "./clipboard";

vi.mock("./chat/markdown", () => ({
  default: (text) => `<p>${text}</p>`,
}));

class MockClipboardItem {
  constructor(data) {
    this.data = data;
  }
}
Object.defineProperty(globalThis, "ClipboardItem", {
  value: MockClipboardItem,
  writable: true,
  configurable: true,
});

Object.defineProperty(navigator, "clipboard", {
  value: { write: vi.fn() },
  writable: true,
  configurable: true,
});

describe("clipboard", () => {
  beforeEach(() => {
    navigator.clipboard.write.mockImplementation(() => Promise.resolve());
  });

  it("writes markdown as rich text to the clipboard", async () => {
    await copyMarkdownAsRichText("hello");
    expect(navigator.clipboard.write).toHaveBeenCalledTimes(1);
    const items = navigator.clipboard.write.mock.calls[0][0];
    expect(items[0]).toBeInstanceOf(MockClipboardItem);
  });

  it("does not throw when navigator.clipboard.write fails", async () => {
    navigator.clipboard.write.mockRejectedValue(new Error("Denied"));
    await expect(copyMarkdownAsRichText("hello")).resolves.toBeUndefined();
  });
});
