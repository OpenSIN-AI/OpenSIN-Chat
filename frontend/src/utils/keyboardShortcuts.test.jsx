// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, afterEach } from "vitest";
import { render } from "@testing-library/react";
import {
  isMac,
  SHORTCUTS,
  initKeyboardShortcuts,
  KeyboardShortcutWrapper,
} from "./keyboardShortcuts";

describe("keyboardShortcuts", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("detects macOS based on navigator.platform", () => {
    expect(typeof isMac).toBe("boolean");
  });

  it("exposes shortcut definitions", () => {
    expect(SHORTCUTS["⌘ + ,"].translationKey).toBe("settings");
    expect(SHORTCUTS["⌘ + H"].translationKey).toBe("home");
    expect(SHORTCUTS.F1.translationKey).toBe("help");
  });

  it("initKeyboardShortcuts routes F1 to the help event", () => {
    const cleanup = initKeyboardShortcuts();
    const handler = vi.fn();
    window.addEventListener("keyboard-shortcuts-help", handler);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "F1" }));
    expect(handler).toHaveBeenCalledTimes(1);
    window.removeEventListener("keyboard-shortcuts-help", handler);
    cleanup();
  });

  it("initKeyboardShortcuts does nothing for unknown shortcuts", () => {
    const cleanup = initKeyboardShortcuts();
    const handler = vi.fn();
    window.addEventListener("keyboard-shortcuts-help", handler);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "z", metaKey: true }));
    expect(handler).not.toHaveBeenCalled();
    window.removeEventListener("keyboard-shortcuts-help", handler);
    cleanup();
  });

  it("ignores bare Control and Shift keys", () => {
    const cleanup = initKeyboardShortcuts();
    const handler = vi.fn();
    window.addEventListener("keyboard-shortcuts-help", handler);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Control" }));
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Shift" }));
    expect(handler).not.toHaveBeenCalled();
    window.removeEventListener("keyboard-shortcuts-help", handler);
    cleanup();
  });

  it("KeyboardShortcutWrapper renders children and registers shortcuts", () => {
    const { container } = render(
      <KeyboardShortcutWrapper>
        <div data-testid="child">child</div>
      </KeyboardShortcutWrapper>,
    );
    expect(container.querySelector('[data-testid="child"]')).toBeInTheDocument();
  });
});
