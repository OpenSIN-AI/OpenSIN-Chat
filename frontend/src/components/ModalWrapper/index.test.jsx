// SPDX-License-Identifier: MIT
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import ModalWrapper from "./index";

afterEach(cleanup);

describe("ModalWrapper", () => {
  it("renders nothing when isOpen is false", () => {
    const { container } = render(
      <ModalWrapper isOpen={false} noPortal>
        <p>Hidden content</p>
      </ModalWrapper>,
    );
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText("Hidden content")).not.toBeInTheDocument();
  });

  it("renders children inline when isOpen and noPortal are true", () => {
    render(
      <ModalWrapper isOpen noPortal>
        <p>Visible content</p>
      </ModalWrapper>,
    );
    expect(screen.getByText("Visible content")).toBeInTheDocument();
  });

  it("applies the overlay styling to the wrapper", () => {
    const { container } = render(
      <ModalWrapper isOpen noPortal>
        <span>Child</span>
      </ModalWrapper>,
    );
    const overlay = container.firstChild;
    expect(overlay).toHaveClass("fixed");
    expect(overlay.className).toContain("backdrop-blur-sm");
  });
});
