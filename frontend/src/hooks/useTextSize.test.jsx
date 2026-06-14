// SPDX-License-Identifier: MIT
import { describe, it, expect } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import useTextSize from "./useTextSize";

describe("useTextSize", () => {
  beforeEach(() => {
    window.localStorage.getItem.mockImplementation(() => null);
  });

  it("returns default text size", () => {
    const { result } = renderHook(() => useTextSize());
    expect(result.current.textSize).toBe("normal");
    expect(result.current.textSizeClass).toBe("text-[14px]");
  });

  it("loads stored text size from localStorage", () => {
    window.localStorage.getItem.mockImplementation((key) =>
      key === "openafd_text_size" ? "large" : null,
    );
    const { result } = renderHook(() => useTextSize());
    expect(result.current.textSize).toBe("large");
    expect(result.current.textSizeClass).toBe("text-[18px]");
  });

  it("updates when textSizeChange event fires", async () => {
    const { result } = renderHook(() => useTextSize());
    act(() => {
      window.dispatchEvent(
        new CustomEvent("textSizeChange", { detail: "small" }),
      );
    });
    await waitFor(() => expect(result.current.textSize).toBe("small"));
    expect(result.current.textSizeClass).toBe("text-[12px]");
  });
});
