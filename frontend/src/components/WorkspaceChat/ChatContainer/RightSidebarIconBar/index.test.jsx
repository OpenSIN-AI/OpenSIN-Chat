// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
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

// Render helper that provides the Router context useNavigate() requires.
function renderBar() {
  return render(
    <MemoryRouter>
      <RightSidebarIconBar />
    </MemoryRouter>,
  );
}

describe("RightSidebarIconBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all icon buttons (7 panels + PDF-analysis nav)", () => {
    const { container } = renderBar();
    const buttons = container.querySelectorAll("button");
    expect(buttons.length).toBe(8);
  });

  it("calls toggleSidebar with 'preview' when preview icon clicked", () => {
    const { container } = renderBar();
    const previewButton = container.querySelector(
      'button[aria-label="Preview"]',
    );
    fireEvent.click(previewButton);
    expect(mockToggleSidebar).toHaveBeenCalledWith("preview");
  });

  it("calls toggleSidebar with 'database' when database icon clicked", () => {
    const { container } = renderBar();
    const dbButton = container.querySelector(
      'button[aria-label="Politician database"]',
    );
    fireEvent.click(dbButton);
    expect(mockToggleSidebar).toHaveBeenCalledWith("database");
  });

  it("has an accessible label on every button (a11y)", () => {
    const { container } = renderBar();
    const buttons = container.querySelectorAll("button");
    buttons.forEach((btn) => {
      expect(btn.getAttribute("aria-label")).toBeTruthy();
    });
  });
});
