// SPDX-License-Identifier: MIT
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import useNotebookMode from "./useNotebookMode";

describe("useNotebookMode", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("uses chat by default", () => {
    const { result } = renderHook(() =>
      useNotebookMode({
        notebookSlug: "example",
        threadSlug: "thread-1",
      }),
    );

    expect(result.current.modeId).toBe("chat");
  });

  it("stores a mode per thread", () => {
    const first = renderHook(() =>
      useNotebookMode({
        notebookSlug: "example",
        threadSlug: "thread-1",
      }),
    );

    act(() => {
      first.result.current.setModeId("code");
    });

    const second = renderHook(() =>
      useNotebookMode({
        notebookSlug: "example",
        threadSlug: "thread-2",
      }),
    );

    expect(first.result.current.modeId).toBe("code");
    expect(second.result.current.modeId).toBe("chat");
  });

  it("synchronizes instances in the same chat", () => {
    const first = renderHook(() =>
      useNotebookMode({
        notebookSlug: "example",
        threadSlug: "thread-1",
      }),
    );

    const second = renderHook(() =>
      useNotebookMode({
        notebookSlug: "example",
        threadSlug: "thread-1",
      }),
    );

    act(() => {
      first.result.current.setModeId("work");
    });

    expect(second.result.current.modeId).toBe("work");
  });
});
