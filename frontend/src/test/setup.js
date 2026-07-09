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

// jsdom does not implement ResizeObserver. Provide a no-op stub so components
// that use scroll areas or resize-aware layouts don't throw ReferenceError.
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// jsdom does not implement ClipboardItem. Provide a minimal stub so any code
// that calls `new ClipboardItem({ ... })` in tests does not throw a ReferenceError
// before it can reach the mocked navigator.clipboard.write().
if (typeof globalThis.ClipboardItem === "undefined") {
  class ClipboardItemStub {
    constructor(data) {
      this._data = data;
    }
    getType(type) {
      return Promise.resolve(this._data[type]);
    }
    get types() {
      return Object.keys(this._data);
    }
  }
  globalThis.ClipboardItem = ClipboardItemStub;
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
