// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import ImageLightbox, { openImageLightbox } from "./index";

vi.mock("@phosphor-icons/react", () => ({
  X: () => <svg data-testid="x-icon" />,
  CaretLeft: () => <svg data-testid="caret-left-icon" />,
  CaretRight: () => <svg data-testid="caret-right-icon" />,
}));

describe("ImageLightbox", () => {
  beforeEach(() => {
    const root = document.createElement("div");
    root.id = "root";
    document.body.appendChild(root);
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renders nothing when no images are set", () => {
    const { container } = render(<ImageLightbox />);
    expect(container.innerHTML).toBe("");
  });

  it("renders lightbox when opened via openImageLightbox", () => {
    render(<ImageLightbox />);
    act(() => {
      openImageLightbox(
        [{ contentString: "data:image/png;base64,abc", name: "test.png" }],
        0
      );
    });
    expect(screen.getByRole("img")).toBeInTheDocument();
    expect(screen.getByAltText("test.png")).toBeInTheDocument();
  });

  it("renders close button with aria-label", () => {
    render(<ImageLightbox />);
    act(() => {
      openImageLightbox(
        [{ contentString: "data:image/png;base64,abc", name: "img.png" }],
        0
      );
    });
    expect(screen.getByLabelText("Close lightbox")).toBeInTheDocument();
  });

  it("closes when close button is clicked", () => {
    render(<ImageLightbox />);
    act(() => {
      openImageLightbox(
        [{ contentString: "data:image/png;base64,abc", name: "img.png" }],
        0
      );
    });
    expect(screen.getByRole("img")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Close lightbox"));
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("does not render navigation buttons for single image", () => {
    render(<ImageLightbox />);
    act(() => {
      openImageLightbox(
        [{ contentString: "data:image/png;base64,abc", name: "single.png" }],
        0
      );
    });
    expect(screen.queryByLabelText("Previous image")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Next image")).not.toBeInTheDocument();
  });

  it("renders navigation buttons for multiple images", () => {
    render(<ImageLightbox />);
    act(() => {
      openImageLightbox(
        [
          { contentString: "data:image/png;base64,aaa", name: "a.png" },
          { contentString: "data:image/png;base64,bbb", name: "b.png" },
        ],
        0
      );
    });
    expect(screen.getByLabelText("Previous image")).toBeInTheDocument();
    expect(screen.getByLabelText("Next image")).toBeInTheDocument();
  });

  it("displays image counter for multiple images", () => {
    render(<ImageLightbox />);
    act(() => {
      openImageLightbox(
        [
          { contentString: "data:image/png;base64,aaa", name: "a.png" },
          { contentString: "data:image/png;base64,bbb", name: "b.png" },
          { contentString: "data:image/png;base64,ccc", name: "c.png" },
        ],
        1
      );
    });
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
  });

  it("navigates to next image on Next click", () => {
    render(<ImageLightbox />);
    act(() => {
      openImageLightbox(
        [
          { contentString: "data:image/png;base64,aaa", name: "a.png" },
          { contentString: "data:image/png;base64,bbb", name: "b.png" },
        ],
        0
      );
    });
    expect(screen.getByAltText("a.png")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Next image"));
    expect(screen.getByAltText("b.png")).toBeInTheDocument();
  });

  it("navigates to previous image on Previous click", () => {
    render(<ImageLightbox />);
    act(() => {
      openImageLightbox(
        [
          { contentString: "data:image/png;base64,aaa", name: "a.png" },
          { contentString: "data:image/png;base64,bbb", name: "b.png" },
        ],
        1
      );
    });
    expect(screen.getByAltText("b.png")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Previous image"));
    expect(screen.getByAltText("a.png")).toBeInTheDocument();
  });

  it("wraps around on next at last image", () => {
    render(<ImageLightbox />);
    act(() => {
      openImageLightbox(
        [
          { contentString: "data:image/png;base64,aaa", name: "a.png" },
          { contentString: "data:image/png;base64,bbb", name: "b.png" },
        ],
        1
      );
    });
    fireEvent.click(screen.getByLabelText("Next image"));
    expect(screen.getByAltText("a.png")).toBeInTheDocument();
  });

  it("wraps around on previous at first image", () => {
    render(<ImageLightbox />);
    act(() => {
      openImageLightbox(
        [
          { contentString: "data:image/png;base64,aaa", name: "a.png" },
          { contentString: "data:image/png;base64,bbb", name: "b.png" },
        ],
        0
      );
    });
    fireEvent.click(screen.getByLabelText("Previous image"));
    expect(screen.getByAltText("b.png")).toBeInTheDocument();
  });

  it("closes on Escape key", () => {
    render(<ImageLightbox />);
    act(() => {
      openImageLightbox(
        [{ contentString: "data:image/png;base64,abc", name: "esc.png" }],
        0
      );
    });
    expect(screen.getByRole("img")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
