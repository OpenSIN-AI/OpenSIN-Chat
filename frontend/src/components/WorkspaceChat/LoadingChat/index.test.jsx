// SPDX-License-Identifier: MIT
// Tests for the LoadingChat skeleton component (Issue #391).
//
// Verifies the loading/empty state renders skeleton placeholders and
// adapts to mobile vs. desktop layout via the useIsMobileLayout hook.

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import LoadingChat from "./index";

vi.mock("@/hooks/useIsMobileLayout", () => ({
  useIsMobileLayout: vi.fn(() => false),
}));

// Mock the skeleton CSS import so jsdom doesn't choke
vi.mock("react-loading-skeleton/dist/skeleton.css", () => ({}));

import { useIsMobileLayout } from "@/hooks/useIsMobileLayout";

describe("LoadingChat — desktop layout", () => {
  it("renders skeleton placeholders", () => {
    useIsMobileLayout.mockReturnValue(false);
    const { container } = render(<LoadingChat />);
    // react-loading-skeleton renders elements with class "react-loading-skeleton"
    const skeletons = container.querySelectorAll(".react-loading-skeleton");
    expect(skeletons.length).toBeGreaterThanOrEqual(3);
  });

  it("renders a scrollable container", () => {
    useIsMobileLayout.mockReturnValue(false);
    const { container } = render(<LoadingChat />);
    const wrapper = container.firstElementChild;
    expect(wrapper).toBeTruthy();
    expect(wrapper.className).toContain("overflow-y-scroll");
  });
});

describe("LoadingChat — mobile layout", () => {
  it("adjusts content height for mobile", () => {
    useIsMobileLayout.mockReturnValue(true);
    const { container } = render(<LoadingChat />);
    const wrapper = container.firstElementChild;
    expect(wrapper).toBeTruthy();
    // On mobile the content height should be 100%
    expect(wrapper.style.getPropertyValue("--content-height")).toBe("100%");
  });
});

describe("LoadingChat — desktop content height", () => {
  it("subtracts margin from content height on desktop", () => {
    useIsMobileLayout.mockReturnValue(false);
    const { container } = render(<LoadingChat />);
    const wrapper = container.firstElementChild;
    expect(wrapper.style.getPropertyValue("--content-height")).toContain(
      "calc(100% - 32px)",
    );
  });
});
