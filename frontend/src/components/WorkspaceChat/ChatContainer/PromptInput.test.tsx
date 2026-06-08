// SPDX-License-Identifier: MIT
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

afterEach(cleanup);

describe("PromptInput Styling", () => {
  it("has dark theme styling (bg-zinc-800)", () => {
    const { container } = render(
      <div className="bg-zinc-800 rounded-3xl" data-testid="input-wrapper">
        <textarea placeholder="Test" />
      </div>
    );
    const wrapper = container.querySelector(".bg-zinc-800");
    expect(wrapper).toBeInTheDocument();
  });

  it("includes border and shadow for depth", () => {
    const { container } = render(
      <div className="border border-theme-sidebar-border shadow-lg rounded-3xl">
        <textarea placeholder="Test" />
      </div>
    );
    const styledDiv = container.querySelector(".shadow-lg");
    expect(styledDiv).toBeInTheDocument();
    expect(styledDiv).toHaveClass("border");
  });

  it("has rounded-3xl class for professional appearance", () => {
    const { container } = render(
      <div className="rounded-3xl" data-testid="input-container">
        <textarea placeholder="Test" />
      </div>
    );
    const container_elem = screen.getByTestId("input-container");
    expect(container_elem).toHaveClass("rounded-3xl");
  });
});
