// SPDX-License-Identifier: MIT
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ChangeWarning from "./index";

vi.mock("@phosphor-icons/react", () => ({
  Warning: () => <svg data-testid="warning-icon" />,
  X: ({ size, weight }) => <svg data-testid="x-icon" data-size={size} data-weight={weight} />,
}));

describe("ChangeWarning", () => {
  it("renders without crashing", () => {
    render(
      <ChangeWarning
        warningText="This will delete everything"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );
    expect(
      screen.getByText("WARNING - This action is irreversible")
    ).toBeInTheDocument();
  });

  it("displays the warning text", () => {
    render(
      <ChangeWarning
        warningText="Data loss imminent"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );
    expect(screen.getByText("Data loss imminent")).toBeInTheDocument();
  });

  it("renders multiline warning text from \\n separators", () => {
    render(
      <ChangeWarning
        warningText={"Line one\\nLine two"}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );
    expect(screen.getByText("Line one")).toBeInTheDocument();
    expect(screen.getByText("Line two")).toBeInTheDocument();
  });

  it("calls onClose when Cancel button is clicked", () => {
    const onClose = vi.fn();
    render(
      <ChangeWarning
        warningText="test"
        onClose={onClose}
        onConfirm={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onConfirm when Confirm button is clicked", () => {
    const onConfirm = vi.fn();
    render(
      <ChangeWarning
        warningText="test"
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />
    );
    fireEvent.click(screen.getByText("Confirm"));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("renders the close (X) button", () => {
    render(
      <ChangeWarning
        warningText="test"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );
    expect(screen.getByTestId("x-icon")).toBeInTheDocument();
  });

  it("calls onClose when X button is clicked", () => {
    const onClose = vi.fn();
    render(
      <ChangeWarning
        warningText="test"
        onClose={onClose}
        onConfirm={vi.fn()}
      />
    );
    fireEvent.click(screen.getByTestId("x-icon").closest("button"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("renders Are you sure prompt", () => {
    render(
      <ChangeWarning
        warningText="test"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );
    expect(
      screen.getByText("Are you sure you want to proceed?")
    ).toBeInTheDocument();
  });
});
