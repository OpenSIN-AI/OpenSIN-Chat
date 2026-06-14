// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import RightSidebarIconBar from "./index";
vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

const mockToggleSidebar = vi.fn();
const mockCloseSidebar = vi.fn();

vi.mock("../ChatSidebar", () => ({
  useChatSidebar: () => ({
    activeSidebar: null,
    toggleSidebar: mockToggleSidebar,
    closeSidebar: mockCloseSidebar,
  }),
}));

describe("RightSidebarIconBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders 7 panel icon buttons", () => {
    const { container } = render(<RightSidebarIconBar />);
    const buttons = container.querySelectorAll("button");
    expect(buttons.length).toBe(7);
  });

  it("calls toggleSidebar with 'preview' when preview icon clicked", () => {
    const { container } = render(<RightSidebarIconBar />);
    const previewButton = container.querySelector(
      'button[aria-label="Preview"]',
    );
    fireEvent.click(previewButton);
    expect(mockToggleSidebar).toHaveBeenCalledWith("preview");
  });

  it("calls toggleSidebar with 'database' when database icon clicked", () => {
    const { container } = render(<RightSidebarIconBar />);
    const dbButton = container.querySelector(
      'button[aria-label="Politician database"]',
    );
    fireEvent.click(dbButton);
    expect(mockToggleSidebar).toHaveBeenCalledWith("database");
  });

  it("has accessible labels on every button (a11y)", () => {
    const { container } = render(<RightSidebarIconBar />);
    const buttons = container.querySelectorAll("button");
    buttons.forEach((btn) => {
      expect(btn.getAttribute("aria-label")).toBeTruthy();
    });
  });
});
