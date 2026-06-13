// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import KeyboardShortcutsHelp from "./index";
vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

vi.mock("@/utils/keyboardShortcuts", () => ({
  SHORTCUTS: {
    "⌘ + ,": { translationKey: "settings", action: vi.fn() },
    "⌘ + H": { translationKey: "home", action: vi.fn() },
  },
  isMac: true,
  KEYBOARD_SHORTCUTS_HELP_EVENT: "keyboard-shortcuts-help",
}));


describe("KeyboardShortcutsHelp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing initially", () => {
    const { container } = render(<KeyboardShortcutsHelp />);
    expect(container.innerHTML).toBe("");
  });

  it("renders when the help event is dispatched", () => {
    render(<KeyboardShortcutsHelp />);
    act(() => {
      window.dispatchEvent(new CustomEvent("keyboard-shortcuts-help"));
    });
    expect(screen.getByText("Keyboard Shortcuts")).toBeInTheDocument();
  });

  it("shows keyboard shortcuts when open", () => {
    render(<KeyboardShortcutsHelp />);
    act(() => {
      window.dispatchEvent(new CustomEvent("keyboard-shortcuts-help"));
    });
    expect(screen.getByText("Open Settings")).toBeInTheDocument();
    expect(screen.getByText("Go to Home")).toBeInTheDocument();
  });

  it("displays shortcut keys in kbd elements", () => {
    render(<KeyboardShortcutsHelp />);
    act(() => {
      window.dispatchEvent(new CustomEvent("keyboard-shortcuts-help"));
    });
    const kbdElements = screen.getAllByText("⌘ + ,");
    expect(kbdElements.length).toBeGreaterThanOrEqual(1);
  });

  it("closes when the close button is clicked", () => {
    render(<KeyboardShortcutsHelp />);
    act(() => {
      window.dispatchEvent(new CustomEvent("keyboard-shortcuts-help"));
    });
    expect(screen.getByText("Keyboard Shortcuts")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Close"));
    expect(screen.queryByText("Keyboard Shortcuts")).not.toBeInTheDocument();
  });

  it("toggles open/closed on repeated events", () => {
    render(<KeyboardShortcutsHelp />);
    act(() => {
      window.dispatchEvent(new CustomEvent("keyboard-shortcuts-help"));
    });
    expect(screen.getByText("Keyboard Shortcuts")).toBeInTheDocument();
    act(() => {
      window.dispatchEvent(new CustomEvent("keyboard-shortcuts-help"));
    });
    expect(screen.queryByText("Keyboard Shortcuts")).not.toBeInTheDocument();
  });
});
