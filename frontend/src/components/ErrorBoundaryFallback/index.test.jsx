// SPDX-License-Identifier: MIT
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ErrorBoundaryFallback from "./index";

vi.mock("react-router-dom", () => ({
  NavLink: ({ children, to }) => <a href={to}>{children}</a>,
}));

vi.mock("@phosphor-icons/react", () => ({
  House: () => <svg data-testid="house-icon" />,
  ArrowClockwise: () => <svg data-testid="arrow-icon" />,
  Copy: () => <svg data-testid="copy-icon" />,
  Check: () => <svg data-testid="check-icon" />,
}));

describe("ErrorBoundaryFallback", () => {
  const error = {
    name: "TypeError",
    message: "Something went wrong",
    stack: "Error at line 42 in app.js",
  };

  it("renders without crashing", () => {
    render(
      <ErrorBoundaryFallback error={error} resetErrorBoundary={vi.fn()} />
    );
    expect(screen.getByText("An error occurred.")).toBeInTheDocument();
  });

  it("displays the error message", () => {
    render(
      <ErrorBoundaryFallback error={error} resetErrorBoundary={vi.fn()} />
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("calls resetErrorBoundary when Reset button is clicked", () => {
    const resetErrorBoundary = vi.fn();
    render(
      <ErrorBoundaryFallback
        error={error}
        resetErrorBoundary={resetErrorBoundary}
      />
    );
    fireEvent.click(screen.getByText("Reset"));
    expect(resetErrorBoundary).toHaveBeenCalledOnce();
  });

  it("renders Home link pointing to /", () => {
    render(
      <ErrorBoundaryFallback error={error} resetErrorBoundary={vi.fn()} />
    );
    const homeLink = screen.getByText("Home").closest("a");
    expect(homeLink).toHaveAttribute("href", "/");
  });

  it("handles missing error gracefully", () => {
    render(
      <ErrorBoundaryFallback error={null} resetErrorBoundary={vi.fn()} />
    );
    expect(screen.getByText("An error occurred.")).toBeInTheDocument();
  });
});
