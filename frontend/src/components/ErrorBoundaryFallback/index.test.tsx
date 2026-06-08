// SPDX-License-Identifier: MIT
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ErrorBoundaryFallback from "./index";

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("ErrorBoundaryFallback", () => {
  const error = new Error("Test error");
  error.stack = "Error: Test error\n  at Test.js:1:1";
  const resetErrorBoundary = vi.fn();

  it("renders the error message", () => {
    renderWithRouter(
      <ErrorBoundaryFallback
        error={error}
        resetErrorBoundary={resetErrorBoundary}
      />
    );
    expect(screen.getByText("An error occurred.")).toBeInTheDocument();
    expect(screen.getByText("Test error")).toBeInTheDocument();
  });

  it("calls resetErrorBoundary when Reset is clicked", () => {
    renderWithRouter(
      <ErrorBoundaryFallback
        error={error}
        resetErrorBoundary={resetErrorBoundary}
      />
    );
    fireEvent.click(screen.getByText("Reset"));
    expect(resetErrorBoundary).toHaveBeenCalledTimes(1);
  });

  it("renders a Home link pointing to /", () => {
    renderWithRouter(
      <ErrorBoundaryFallback
        error={error}
        resetErrorBoundary={resetErrorBoundary}
      />
    );
    const homeLink = screen.getByText("Home").closest("a");
    expect(homeLink).toHaveAttribute("href", "/");
  });

  it("handles missing error properties gracefully", () => {
    renderWithRouter(
      <ErrorBoundaryFallback
        error={{}}
        resetErrorBoundary={resetErrorBoundary}
      />
    );
    expect(screen.getByText("An error occurred.")).toBeInTheDocument();
  });
});
