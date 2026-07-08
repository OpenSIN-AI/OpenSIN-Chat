// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useRef } from "react";
import useFocusTrap from "./useFocusTrap";

function TestComponent({ active, onEscape }) {
  const ref = useFocusTrap(active, onEscape);
  return (
    <div ref={ref} data-testid="trap-container" tabIndex={-1}>
      <button data-testid="btn-1">Button 1</button>
      <button data-testid="btn-2">Button 2</button>
      <button data-testid="btn-3">Button 3</button>
    </div>
  );
}

describe("useFocusTrap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.style.overflow = "";
  });

  it("renders the container with the ref attached", () => {
    render(<TestComponent active={true} />);
    expect(screen.getByTestId("trap-container")).toBeInTheDocument();
  });

  it("locks body overflow when active", () => {
    render(<TestComponent active={true} />);
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("restores body overflow when deactivated", () => {
    const { rerender } = render(<TestComponent active={true} />);
    expect(document.body.style.overflow).toBe("hidden");
    rerender(<TestComponent active={false} />);
    expect(document.body.style.overflow).toBe("");
  });

  it("calls onEscape when Escape key is pressed", () => {
    const onEscape = vi.fn();
    render(<TestComponent active={true} onEscape={onEscape} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it("does not call onEscape when not active", () => {
    const onEscape = vi.fn();
    render(<TestComponent active={false} onEscape={onEscape} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onEscape).not.toHaveBeenCalled();
  });

  it("traps Tab key — cycles from last to first focusable", () => {
    render(<TestComponent active={true} />);
    const lastBtn = screen.getByTestId("btn-3");
    lastBtn.focus();
    expect(document.activeElement).toBe(lastBtn);

    fireEvent.keyDown(document, { key: "Tab" });
    // After Tab on last element, focus should cycle to first
    expect(document.activeElement).toBe(screen.getByTestId("btn-1"));
  });

  it("traps Shift+Tab — cycles from first to last focusable", () => {
    render(<TestComponent active={true} />);
    const firstBtn = screen.getByTestId("btn-1");
    firstBtn.focus();
    expect(document.activeElement).toBe(firstBtn);

    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    // After Shift+Tab on first element, focus should cycle to last
    expect(document.activeElement).toBe(screen.getByTestId("btn-3"));
  });

  it("does not lock body overflow when inactive", () => {
    render(<TestComponent active={false} />);
    expect(document.body.style.overflow).not.toBe("hidden");
  });
});
