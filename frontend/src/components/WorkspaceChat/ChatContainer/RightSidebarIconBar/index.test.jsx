// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import RightSidebarIconBar from "./index";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key, fallback) => fallback || key }),
}));

const mockToggleSidebar = vi.fn();
const mockToggleRightSidebar = vi.fn();

vi.mock("../ChatSidebar", () => ({
  useChatSidebar: () => ({
    activeSidebar: null,
    rightSidebarOpen: false,
    toggleSidebar: mockToggleSidebar,
    toggleRightSidebar: mockToggleRightSidebar,
  }),
}));

describe("RightSidebarIconBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all 8 icon buttons (toggle + 7 panel icons)", () => {
    const { container } = render(<RightSidebarIconBar />);
    const buttons = container.querySelectorAll("button");
    expect(buttons.length).toBe(8);
  });

  it("calls toggleRightSidebar when the toggle button is clicked", () => {
    const { container } = render(<RightSidebarIconBar />);
    const toggleButton = container.querySelector(
      'button[aria-label="Rechte Seitenleiste"]',
    );
    fireEvent.click(toggleButton);
    expect(mockToggleRightSidebar).toHaveBeenCalledTimes(1);
  });

  it("calls toggleSidebar with 'preview' when preview icon clicked", () => {
    const { container } = render(<RightSidebarIconBar />);
    const previewButton = container.querySelector('button[aria-label="Vorschau"]');
    fireEvent.click(previewButton);
    expect(mockToggleSidebar).toHaveBeenCalledWith("preview");
  });

  it("calls toggleSidebar with 'database' when database icon clicked", () => {
    const { container } = render(<RightSidebarIconBar />);
    const dbButton = container.querySelector(
      'button[aria-label="Politiker-Datenbank"]',
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
