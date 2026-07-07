// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import usePromptInputStorage, {
  clearPromptInputDraft,
} from "./usePromptInputStorage";

describe("usePromptInputStorage", () => {
  beforeEach(() => {
    window.localStorage.getItem.mockImplementation(() => "{}");
    window.localStorage.setItem.mockImplementation(() => {});
  });

  function wrapper({ children }) {
    return (
      <MemoryRouter initialEntries={["/workspace/ws/t/t1"]}>
        <Routes>
          <Route path="/workspace/:slug" element={children} />
          <Route path="/workspace/:slug/t/:threadSlug" element={children} />
        </Routes>
      </MemoryRouter>
    );
  }

  it("restores stored draft on mount", () => {
    const setPromptInput = vi.fn();
    window.localStorage.getItem.mockImplementation((key) => {
      if (key === "opensin_user_prompt_input_map")
        return JSON.stringify({ t1: "draft message" });
      return "{}";
    });

    renderHook(
      () => usePromptInputStorage({ promptInput: "", setPromptInput }),
      { wrapper },
    );
    expect(setPromptInput).toHaveBeenCalledWith("draft message");
  });

  it("debounces writes to localStorage", async () => {
    const setPromptInput = vi.fn();
    const { rerender } = renderHook(
      ({ promptInput }) =>
        usePromptInputStorage({ promptInput, setPromptInput }),
      { wrapper, initialProps: { promptInput: "" } },
    );

    rerender({ promptInput: "hello" });
    await waitFor(() =>
      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        "opensin_user_prompt_input_map",
        expect.stringContaining("hello"),
      ),
    );
  });

  it("clearPromptInputDraft removes a draft", () => {
    window.localStorage.getItem.mockImplementation((key) => {
      if (key === "opensin_user_prompt_input_map")
        return JSON.stringify({ t1: "draft" });
      return "{}";
    });
    clearPromptInputDraft("t1");
    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      "opensin_user_prompt_input_map",
      JSON.stringify({ t1: "" }),
    );
  });
});
