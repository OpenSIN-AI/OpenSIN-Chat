// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, render, screen, fireEvent } from "@testing-library/react";
import { useSidebarToggle, ToggleSidebarButton, SIDEBAR_TOGGLE_EVENT } from "./index";

describe("useSidebarToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, "", "/");
  });

  it("returns showSidebar as true by default", () => {
    const { result } = renderHook(() => useSidebarToggle());
    expect(result.current.showSidebar).toBe(true);
  });

  it("returns showSidebar as false when localStorage has 'closed'", () => {
    localStorage.getItem.mockReturnValueOnce("closed");
    const { result } = renderHook(() => useSidebarToggle());
    expect(result.current.showSidebar).toBe(false);
  });

  it("returns canToggleSidebar as true for home path", () => {
    window.history.pushState({}, "", "/");
    const { result } = renderHook(() => useSidebarToggle());
    expect(result.current.canToggleSidebar).toBe(true);
  });

  it("returns canToggleSidebar as true for workspace path", () => {
    window.history.pushState({}, "", "/workspace/my-workspace");
    const { result } = renderHook(() => useSidebarToggle());
    expect(result.current.canToggleSidebar).toBe(true);
  });

  it("returns canToggleSidebar as true for workspace thread path", () => {
    window.history.pushState({}, "", "/workspace/my-workspace/t/thread-123");
    const { result } = renderHook(() => useSidebarToggle());
    expect(result.current.canToggleSidebar).toBe(true);
  });

  it("returns canToggleSidebar as false for other paths", () => {
    window.history.pushState({}, "", "/settings");
    const { result } = renderHook(() => useSidebarToggle());
    expect(result.current.canToggleSidebar).toBe(false);
  });

  it("setShowSidebar updates state", () => {
    const { result } = renderHook(() => useSidebarToggle());
    act(() => {
      result.current.setShowSidebar(false);
    });
    expect(result.current.showSidebar).toBe(false);
  });

  it("dispatches sidebar-toggle event on state change", () => {
    const handler = vi.fn();
    window.addEventListener(SIDEBAR_TOGGLE_EVENT, handler);
    const { result } = renderHook(() => useSidebarToggle());
    act(() => {
      result.current.setShowSidebar(false);
    });
    expect(handler).toHaveBeenCalled();
    window.removeEventListener(SIDEBAR_TOGGLE_EVENT, handler);
  });
});

describe("ToggleSidebarButton", () => {
  it("renders button with aria-label for visible sidebar", () => {
    const setShowSidebar = vi.fn();
    render(<ToggleSidebarButton showSidebar={true} setShowSidebar={setShowSidebar} />);
    const button = screen.getByRole("button");
    expect(button.getAttribute("aria-label")).toContain("Hide Sidebar");
  });

  it("renders button with aria-label for hidden sidebar", () => {
    const setShowSidebar = vi.fn();
    render(<ToggleSidebarButton showSidebar={false} setShowSidebar={setShowSidebar} />);
    const button = screen.getByRole("button");
    expect(button.getAttribute("aria-label")).toContain("Show Sidebar");
  });

  it("calls setShowSidebar on click", () => {
    const setShowSidebar = vi.fn();
    render(<ToggleSidebarButton showSidebar={true} setShowSidebar={setShowSidebar} />);
    const button = screen.getByRole("button");
    fireEvent.click(button);
    expect(setShowSidebar).toHaveBeenCalled();
  });
});
