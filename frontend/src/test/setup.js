// SPDX-License-Identifier: MIT
// Global test setup for Vitest.
// Extends expect() with jest-dom matchers (toBeInTheDocument, toHaveTextContent, ...)
// and resets the DOM between tests to avoid cross-test leakage.
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
