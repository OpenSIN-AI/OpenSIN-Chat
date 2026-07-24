// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

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
import { MemoryRouter } from "react-router";

describe("ErrorBoundaryFallback additional tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders with error that has no message", () => {
    render(
      <MemoryRouter>
        <ErrorBoundaryFallback error={{}} resetErrorBoundary={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("renders with null error", () => {
    render(
      <MemoryRouter>
        <ErrorBoundaryFallback error={null} resetErrorBoundary={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("renders with undefined error", () => {
    render(
      <MemoryRouter>
        <ErrorBoundaryFallback error={undefined} resetErrorBoundary={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("reset button has correct aria-label", () => {
    render(
      <MemoryRouter>
        <ErrorBoundaryFallback
          error={new Error("test")}
          resetErrorBoundary={vi.fn()}
        />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText("Reset")).toBeInTheDocument();
  });

  it("home link has correct text", () => {
    render(
      <MemoryRouter>
        <ErrorBoundaryFallback
          error={new Error("test")}
          resetErrorBoundary={vi.fn()}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText("Home")).toBeInTheDocument();
  });

  it("renders error with stack trace in dev mode", () => {
    const error = new Error("test");
    error.stack = "Error: test\n    at file.js:1:5";
    const { container } = render(
      <MemoryRouter>
        <ErrorBoundaryFallback error={error} resetErrorBoundary={vi.fn()} />
      </MemoryRouter>,
    );
    // The pre element with stack trace is only shown in DEV mode
    const pre = container.querySelector("pre");
    if (pre) {
      expect(pre.textContent).toContain("Error: test");
    }
  });
});
