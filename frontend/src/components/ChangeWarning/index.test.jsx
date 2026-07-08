// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

vi.mock("@/utils/logger", () => ({
  default: {
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    reportError: vi.fn(),
  },
}));

import ChangeWarningModal from "./index";

describe("ChangeWarningModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the warning title", () => {
    render(
      <ChangeWarningModal warningText="Danger!" onClose={vi.fn()} onConfirm={vi.fn()} />,
    );
    expect(screen.getByText("Warning")).toBeInTheDocument();
  });

  it("renders the warning text lines", () => {
    render(
      <ChangeWarningModal
        warningText="Line 1\nLine 2"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.getByText("Line 1")).toBeInTheDocument();
    expect(screen.getByText("Line 2")).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(
      <ChangeWarningModal warningText="test" onClose={onClose} onConfirm={vi.fn()} />,
    );
    fireEvent.click(screen.getByLabelText("Close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when cancel button is clicked", () => {
    const onClose = vi.fn();
    render(
      <ChangeWarningModal warningText="test" onClose={onClose} onConfirm={vi.fn()} />,
    );
    fireEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onConfirm when confirm button is clicked", () => {
    const onConfirm = vi.fn();
    render(
      <ChangeWarningModal
        warningText="test"
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    );
    fireEvent.click(screen.getByText("Confirm"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("renders with empty warning text", () => {
    const { container } = render(
      <ChangeWarningModal warningText="" onClose={vi.fn()} onConfirm={vi.fn()} />,
    );
    expect(container.querySelector("button")).toBeInTheDocument();
  });
});
