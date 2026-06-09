// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import KeyboardShortcutsHelp from "./index";

vi.mock("@/utils/keyboardShortcuts", () => ({
  SHORTCUTS: {
    "⌘ + ,": { translationKey: "settings", action: vi.fn() },
    "⌘ + H": { translationKey: "home", action: vi.fn() },
  },
  isMac: true,
  KEYBOARD_SHORTCUTS_HELP_EVENT: "keyboard-shortcuts-help",
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) =>
      key
        .replace("keyboard-shortcuts.shortcuts.", "")
        .replace("keyboard-shortcuts.", ""),
  }),
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
    expect(screen.getByText("title")).toBeInTheDocument();
  });

  it("shows keyboard shortcuts when open", () => {
    render(<KeyboardShortcutsHelp />);
    act(() => {
      window.dispatchEvent(new CustomEvent("keyboard-shortcuts-help"));
    });
    expect(screen.getByText("settings")).toBeInTheDocument();
    expect(screen.getByText("home")).toBeInTheDocument();
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
    expect(screen.getByText("title")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Close"));
    expect(screen.queryByText("title")).not.toBeInTheDocument();
  });

  it("toggles open/closed on repeated events", () => {
    render(<KeyboardShortcutsHelp />);
    act(() => {
      window.dispatchEvent(new CustomEvent("keyboard-shortcuts-help"));
    });
    expect(screen.getByText("title")).toBeInTheDocument();
    act(() => {
      window.dispatchEvent(new CustomEvent("keyboard-shortcuts-help"));
    });
    expect(screen.queryByText("title")).not.toBeInTheDocument();
  });
});
