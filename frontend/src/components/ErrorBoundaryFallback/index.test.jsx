// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

vi.mock("@/utils/logger", () => ({
  default: {
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    reportError: vi.fn(),
  },
}));

import ErrorBoundaryFallback from "./index";

function renderFallback(props) {
  return render(
    <MemoryRouter>
      <ErrorBoundaryFallback {...props} />
    </MemoryRouter>,
  );
}

describe("ErrorBoundaryFallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the error title and message", () => {
    const error = new Error("Something went wrong");
    renderFallback({
      error,
      resetErrorBoundary: vi.fn(),
    });
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("renders a reset button that calls resetErrorBoundary", () => {
    const resetErrorBoundary = vi.fn();
    renderFallback({
      error: new Error("test error"),
      resetErrorBoundary,
    });
    const resetBtn = screen.getByLabelText("Reset");
    fireEvent.click(resetBtn);
    expect(resetErrorBoundary).toHaveBeenCalledTimes(1);
  });

  it("renders a home link", () => {
    renderFallback({
      error: new Error("test error"),
      resetErrorBoundary: vi.fn(),
    });
    const homeLink = screen.getByText("Home");
    expect(homeLink.closest("a")).toHaveAttribute("href", "/");
  });

  it("has role alert for accessibility", () => {
    const { container } = renderFallback({
      error: new Error("test"),
      resetErrorBoundary: vi.fn(),
    });
    expect(container.querySelector('[role="alert"]')).toBeInTheDocument();
  });

  it("renders error message from error without message property", () => {
    renderFallback({
      error: { name: "CustomError" },
      resetErrorBoundary: vi.fn(),
    });
    // Should still render the fallback container
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
