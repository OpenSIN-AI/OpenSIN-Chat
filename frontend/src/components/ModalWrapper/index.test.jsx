// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

import ModalWrapper from "./index";

describe("ModalWrapper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure there's a root element for createPortal
    if (!document.getElementById("root")) {
      const root = document.createElement("div");
      root.id = "root";
      document.body.appendChild(root);
    }
  });

  it("renders nothing when isOpen is false", () => {
    const { container } = render(
      <ModalWrapper isOpen={false}>
        <div>Content</div>
      </ModalWrapper>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders children when isOpen is true", () => {
    render(
      <ModalWrapper isOpen={true}>
        <div data-testid="content">Modal Content</div>
      </ModalWrapper>,
    );
    expect(screen.getByTestId("content")).toBeInTheDocument();
  });

  it("renders with dialog role and aria-modal", () => {
    render(
      <ModalWrapper isOpen={true} ariaLabel="Test modal">
        <div>Content</div>
      </ModalWrapper>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-label", "Test modal");
  });

  it("calls closeModal when Escape key is pressed", () => {
    const closeModal = vi.fn();
    render(
      <ModalWrapper isOpen={true} closeModal={closeModal}>
        <div>Content</div>
      </ModalWrapper>,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(closeModal).toHaveBeenCalledTimes(1);
  });

  it("calls closeModal when backdrop is clicked", () => {
    const closeModal = vi.fn();
    render(
      <ModalWrapper isOpen={true} closeModal={closeModal}>
        <div>Content</div>
      </ModalWrapper>,
    );
    const dialog = screen.getByRole("dialog");
    fireEvent.click(dialog);
    expect(closeModal).toHaveBeenCalledTimes(1);
  });

  it("does not call closeModal on content click", () => {
    const closeModal = vi.fn();
    render(
      <ModalWrapper isOpen={true} closeModal={closeModal}>
        <div data-testid="inner-content">Inner</div>
      </ModalWrapper>,
    );
    fireEvent.click(screen.getByTestId("inner-content"));
    expect(closeModal).not.toHaveBeenCalled();
  });

  it("renders without closeModal prop", () => {
    render(
      <ModalWrapper isOpen={true}>
        <div data-testid="content">No close handler</div>
      </ModalWrapper>,
    );
    expect(screen.getByTestId("content")).toBeInTheDocument();
  });

  it("renders inline when noPortal is true", () => {
    const { container } = render(
      <ModalWrapper isOpen={true} noPortal={true}>
        <div data-testid="inline-content">Inline</div>
      </ModalWrapper>,
    );
    expect(container.querySelector('[data-testid="inline-content"]')).toBeInTheDocument();
  });
});
