// SPDX-License-Identifier: MIT
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import ModelTableLoadingSkeleton from "./loading";

vi.mock("react-loading-skeleton", () => ({
  default: ({ count, containerClassName }) => (
    <div
      data-testid="skeleton"
      data-count={count}
      className={containerClassName}
    />
  ),
}));

vi.mock("react-loading-skeleton/dist/skeleton.css", () => ({}));

describe("ModelTableLoadingSkeleton", () => {
  it("renders skeleton rows", () => {
    const { getByTestId } = render(<ModelTableLoadingSkeleton />);
    expect(getByTestId("skeleton")).toHaveAttribute("data-count", "7");
  });
});
