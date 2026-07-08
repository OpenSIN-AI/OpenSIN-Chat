// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

vi.mock("@/components/ModalWrapper", () => ({
  default: ({ children, isOpen, closeModal }) =>
    isOpen ? (
      <div data-testid="modal-wrapper" onClick={closeModal}>
        {children}
      </div>
    ) : null,
}));

import UnsavedChangesDialog from "./index";

function makeBlocker(state = "blocking") {
  return {
    state,
    reset: vi.fn(),
    proceed: vi.fn(),
  };
}

describe("UnsavedChangesDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when blocker state is not blocking", () => {
    const blocker = makeBlocker("unblocked");
    const { container } = render(<UnsavedChangesDialog blocker={blocker} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the dialog when blocker state is blocking", () => {
    const blocker = makeBlocker("blocking");
    render(<UnsavedChangesDialog blocker={blocker} />);
    expect(screen.getByText("Unsaved Changes")).toBeInTheDocument();
  });

  it("calls blocker.reset when Stay on Page is clicked", () => {
    const blocker = makeBlocker("blocking");
    render(<UnsavedChangesDialog blocker={blocker} />);
    fireEvent.click(screen.getByText("Stay on Page"));
    expect(blocker.reset).toHaveBeenCalledTimes(1);
  });

  it("calls blocker.proceed when Discard & Leave is clicked", () => {
    const blocker = makeBlocker("blocking");
    render(<UnsavedChangesDialog blocker={blocker} />);
    fireEvent.click(screen.getByText("Discard & Leave"));
    expect(blocker.proceed).toHaveBeenCalledTimes(1);
  });

  it("calls blocker.reset when modal backdrop is clicked", () => {
    const blocker = makeBlocker("blocking");
    render(<UnsavedChangesDialog blocker={blocker} />);
    fireEvent.click(screen.getByTestId("modal-wrapper"));
    expect(blocker.reset).toHaveBeenCalledTimes(1);
  });
});
