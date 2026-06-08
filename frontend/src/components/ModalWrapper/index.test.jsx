// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ModalWrapper from "./index";

describe("ModalWrapper", () => {
  beforeEach(() => {
    const root = document.createElement("div");
    root.id = "root";
    document.body.appendChild(root);
  });

  it("returns null when isOpen is false", () => {
    const { container } = render(
      <ModalWrapper isOpen={false}>content</ModalWrapper>
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders children via portal when isOpen is true", () => {
    render(<ModalWrapper isOpen={true}>Hello Modal</ModalWrapper>);
    expect(screen.getByText("Hello Modal")).toBeInTheDocument();
  });

  it("renders children inline when noPortal is true", () => {
    const { container } = render(
      <ModalWrapper isOpen={true} noPortal={true}>
        Inline Modal
      </ModalWrapper>
    );
    expect(screen.getByText("Inline Modal")).toBeInTheDocument();
    expect(container.querySelector(".bg-black\\/60")).toBeInTheDocument();
  });

  it("renders overlay element with fixed positioning", () => {
    const { container } = render(
      <ModalWrapper isOpen={true} noPortal={true}>
        overlay test
      </ModalWrapper>
    );
    const overlay = container.firstChild;
    expect(overlay.className).toContain("fixed");
  });
});
