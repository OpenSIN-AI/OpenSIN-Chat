// SPDX-License-Identifier: MIT
// Global test setup for Vitest.
// Extends expect() with jest-dom matchers (toBeInTheDocument, toHaveTextContent, ...)
// and resets the DOM between tests to avoid cross-test leakage.
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Provide a minimal localStorage mock because jsdom does not ship with a working
// localStorage implementation and several app modules read from it during import.
const localStorageMock = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true,
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
