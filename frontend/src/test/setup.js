// SPDX-License-Identifier: MIT
// Purpose: Global test setup for Vitest — loads jest-dom matchers and mocks
// browser APIs that jsdom does not provide.
// Docs: src/test/setup.doc.md
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
