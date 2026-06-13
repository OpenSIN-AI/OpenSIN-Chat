// SPDX-License-Identifier: MIT
import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

vi.mock("@/components/WorkspaceChat/ChatContainer/ChatHistory/ThoughtContainer", () => ({
  THOUGHT_REGEX_COMPLETE: /<thinking>[\s\S]*?<\/thinking>/,
}));

vi.mock("@/utils/clipboard", () => ({
  copyMarkdownAsRichText: vi.fn(() => Promise.resolve()),
}));

import { copyMarkdownAsRichText } from "@/utils/clipboard";
import useCopyText from "./useCopyText";

describe("useCopyText", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("copies text and sets copied state", async () => {
    const { result } = renderHook(() => useCopyText(1000));
    await act(async () => {
      await result.current.copyText("hello");
    });
    expect(copyMarkdownAsRichText).toHaveBeenCalledWith("hello");
    expect(result.current.copied).toBe(true);

    act(() => vi.advanceTimersByTime(1000));
    await waitFor(() => expect(result.current.copied).toBe(false));
  });

  it("does nothing when content is empty", async () => {
    const { result } = renderHook(() => useCopyText());
    await act(async () => {
      await result.current.copyText("");
    });
    expect(copyMarkdownAsRichText).not.toHaveBeenCalled();
    expect(result.current.copied).toBe(false);
  });

  it("strips thinking blocks from content", async () => {
    const { result } = renderHook(() => useCopyText());
    await act(async () => {
      await result.current.copyText("text <thinking>thought</thinking>");
    });
    expect(copyMarkdownAsRichText).toHaveBeenCalledWith("text ");
  });
});
