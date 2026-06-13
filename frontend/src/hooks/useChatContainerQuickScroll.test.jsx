// SPDX-License-Identifier: MIT
import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import useChatContainerQuickScroll from "./useChatContainerQuickScroll";

describe("useChatContainerQuickScroll", () => {
  it("returns a ref and listens to arrow keys", () => {
    const scrollToTop = vi.fn();
    const scrollToBottom = vi.fn();
    const { result } = renderHook(() => useChatContainerQuickScroll());

    // Attach mock methods to the ref
    result.current.chatHistoryRef.current = {
      scrollToTop,
      scrollToBottom,
    };

    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowUp", metaKey: true, ctrlKey: true }),
    );
    expect(scrollToTop).toHaveBeenCalledTimes(1);

    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", metaKey: true, ctrlKey: true }),
    );
    expect(scrollToBottom).toHaveBeenCalledTimes(1);
  });

  it("ignores arrow keys when an input is focused", () => {
    const scrollToTop = vi.fn();
    const { result } = renderHook(() => useChatContainerQuickScroll());
    result.current.chatHistoryRef.current = { scrollToTop, scrollToBottom: vi.fn() };

    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowUp", metaKey: true }),
    );
    expect(scrollToTop).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });
});
