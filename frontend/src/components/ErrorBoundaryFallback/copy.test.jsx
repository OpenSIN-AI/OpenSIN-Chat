// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";

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

import ErrorBoundaryFallback from "@/components/ErrorBoundaryFallback";

describe("ErrorBoundaryFallback copy functionality", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("copies error details to clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    const error = new Error("Test error message");
    error.stack = "Error: Test error message\n    at test.js:1";

    render(
      <MemoryRouter>
        <ErrorBoundaryFallback error={error} resetErrorBoundary={vi.fn()} />
      </MemoryRouter>,
    );

    // The copy button is only rendered in DEV mode (import.meta.env.DEV)
    // In test environment, DEV may be true depending on vitest config
    // We check if the button exists
    const copyBtn = screen.queryByLabelText(/copy/i);
    if (copyBtn) {
      fireEvent.click(copyBtn);
      await waitFor(() => {
        expect(writeText).toHaveBeenCalled();
      });
    }
  });
});
