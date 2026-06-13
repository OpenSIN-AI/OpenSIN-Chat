// SPDX-License-Identifier: MIT
import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { createRef } from "react";
import useChatHistoryScrollHandle from "./useChatHistoryScrollHandle";

describe("useChatHistoryScrollHandle", () => {
  it("exposes scrollToTop and scrollToBottom on the ref", () => {
    const ref = createRef();
    const setIsUserScrolling = vi.fn();
    const scrollToBottom = vi.fn();
    const chatHistoryRef = { current: { scrollTo: vi.fn() } };

    renderHook(() =>
      useChatHistoryScrollHandle(ref, chatHistoryRef, {
        setIsUserScrolling,
        isStreaming: false,
        scrollToBottom,
      }),
    );

    ref.current.scrollToTop();
    expect(setIsUserScrolling).toHaveBeenCalledWith(true);
    expect(chatHistoryRef.current.scrollTo).toHaveBeenCalledWith({
      top: 0,
      behavior: "smooth",
    });

    ref.current.scrollToBottom();
    expect(scrollToBottom).toHaveBeenCalledWith(true);
  });

  it("passes false to scrollToBottom while streaming", () => {
    const ref = createRef();
    const scrollToBottom = vi.fn();
    const chatHistoryRef = { current: { scrollTo: vi.fn() } };

    renderHook(() =>
      useChatHistoryScrollHandle(ref, chatHistoryRef, {
        setIsUserScrolling: vi.fn(),
        isStreaming: true,
        scrollToBottom,
      }),
    );

    ref.current.scrollToBottom();
    expect(scrollToBottom).toHaveBeenCalledWith(false);
  });
});
