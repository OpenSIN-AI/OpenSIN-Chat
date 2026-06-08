// SPDX-License-Identifier: MIT
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ContextualSaveBar from "./index";

vi.mock("@phosphor-icons/react", () => ({
  Warning: () => <svg data-testid="warning-icon" />,
}));

describe("ContextualSaveBar", () => {
  it("returns null when showing is false", () => {
    const { container } = render(
      <ContextualSaveBar showing={false} onSave={vi.fn()} onCancel={vi.fn()} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders when showing is true", () => {
    render(
      <ContextualSaveBar showing={true} onSave={vi.fn()} onCancel={vi.fn()} />
    );
    expect(screen.getByText("Unsaved Changes")).toBeInTheDocument();
  });

  it("renders default showing (false) and returns null", () => {
    const { container } = render(
      <ContextualSaveBar onSave={vi.fn()} onCancel={vi.fn()} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("calls onCancel when Cancel button is clicked", () => {
    const onCancel = vi.fn();
    render(
      <ContextualSaveBar showing={true} onSave={vi.fn()} onCancel={onCancel} />
    );
    fireEvent.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("calls onSave when Save button is clicked", () => {
    const onSave = vi.fn();
    render(
      <ContextualSaveBar showing={true} onSave={onSave} onCancel={vi.fn()} />
    );
    fireEvent.click(screen.getByText("Save"));
    expect(onSave).toHaveBeenCalledOnce();
  });

  it("renders Warning icon", () => {
    render(
      <ContextualSaveBar showing={true} onSave={vi.fn()} onCancel={vi.fn()} />
    );
    expect(screen.getByTestId("warning-icon")).toBeInTheDocument();
  });
});
