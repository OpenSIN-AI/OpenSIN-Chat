// SPDX-License-Identifier: MIT
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useModal } from "./useModal";

describe("useModal", () => {
  it("starts closed and toggles", () => {
    const { result } = renderHook(() => useModal());
    expect(result.current.isOpen).toBe(false);
    act(() => result.current.openModal());
    expect(result.current.isOpen).toBe(true);
    act(() => result.current.closeModal());
    expect(result.current.isOpen).toBe(false);
  });
});
