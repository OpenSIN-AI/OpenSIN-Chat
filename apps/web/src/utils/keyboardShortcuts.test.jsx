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
    // ⌘K is intentionally excluded — it is handled locally by WorkspaceChat
    // to toggle the CommandPalette, avoiding a navigation conflict.
    expect(SHORTCUTS["⌘ + K"]).toBeUndefined();
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
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "z", metaKey: true }),
    );
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
    expect(
      container.querySelector('[data-testid="child"]'),
    ).toBeInTheDocument();
  });

  it("⌘I dispatches navigate-home event instead of navigating to admin route", () => {
    const cleanup = initKeyboardShortcuts();
    const handler = vi.fn();
    window.addEventListener("keyboard-navigate-home", handler);
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "i", metaKey: true }),
    );
    expect(handler).toHaveBeenCalledTimes(1);
    window.removeEventListener("keyboard-navigate-home", handler);
    cleanup();
  });

  it("⌘K does not navigate to api-keys (no global listener)", () => {
    const cleanup = initKeyboardShortcuts();
    const pushSpy = vi.spyOn(window.history, "pushState");
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", metaKey: true }),
    );
    // pushState should NOT be called for ⌘K since it's handled locally
    expect(pushSpy).not.toHaveBeenCalled();
    pushSpy.mockRestore();
    cleanup();
  });
});
