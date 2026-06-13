// SPDX-License-Identifier: MIT
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import PreLoader, { FullScreenLoader } from "./Preloader";

describe("Preloader", () => {
  it("renders a spinner", () => {
    const { container } = render(<PreLoader size="8" />);
    expect(container.firstChild).toHaveClass("animate-spin");
  });

  it("renders the full-screen loader", () => {
    const { container } = render(<FullScreenLoader />);
    expect(container.querySelector("#preloader")).toBeInTheDocument();
  });
});
