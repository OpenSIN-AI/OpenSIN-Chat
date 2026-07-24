// SPDX-License-Identifier: MIT
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import VectorDBItem from "./index";

vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

describe("VectorDBItem", () => {
  const defaultProps = {
    name: "Chroma",
    value: "chroma",
    image: "chroma-logo.png",
    description: "Open-source vector database",
    checked: false,
    onClick: vi.fn(),
  };

  it("renders name and description", () => {
    render(<VectorDBItem {...defaultProps} />);
    expect(screen.getByText("Chroma")).toBeInTheDocument();
    expect(screen.getByText("Open-source vector database")).toBeInTheDocument();
  });

  it("renders logo image with correct alt text", () => {
    render(<VectorDBItem {...defaultProps} />);
    const img = screen.getByAltText("Chroma logo");
    expect(img).toBeInTheDocument();
    expect(img.getAttribute("src")).toBe("chroma-logo.png");
  });

  it("renders hidden checkbox with correct value and checked state", () => {
    render(<VectorDBItem {...defaultProps} />);
    const checkbox = screen.getByDisplayValue("chroma");
    expect(checkbox).toBeInTheDocument();
    expect(checkbox.type).toBe("checkbox");
    expect(checkbox.checked).toBe(false);
  });

  it("renders checked checkbox when checked is true", () => {
    render(<VectorDBItem {...defaultProps} checked={true} />);
    const checkbox = screen.getByDisplayValue("chroma");
    expect(checkbox.checked).toBe(true);
  });

  it("applies bg-theme-bg-secondary class when checked", () => {
    const { container } = render(
      <VectorDBItem {...defaultProps} checked={true} />,
    );
    const wrapper = container.querySelector(".bg-theme-bg-secondary");
    expect(wrapper).toBeInTheDocument();
  });

  it("does not apply bg-theme-bg-secondary when not checked", () => {
    const { container } = render(
      <VectorDBItem {...defaultProps} checked={false} />,
    );
    const wrapper = container.querySelector(".bg-theme-bg-secondary");
    expect(wrapper).not.toBeInTheDocument();
  });

  it("calls onClick with value when clicked", () => {
    const onClick = vi.fn();
    render(<VectorDBItem {...defaultProps} onClick={onClick} />);
    fireEvent.click(screen.getByText("Chroma"));
    expect(onClick).toHaveBeenCalledOnce();
    expect(onClick).toHaveBeenCalledWith("chroma");
  });

  it("calls onClick when clicking the description area", () => {
    const onClick = vi.fn();
    render(<VectorDBItem {...defaultProps} onClick={onClick} />);
    fireEvent.click(screen.getByText("Open-source vector database"));
    expect(onClick).toHaveBeenCalledWith("chroma");
  });
});
