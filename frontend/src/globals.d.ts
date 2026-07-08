// SPDX-License-Identifier: MIT
/// <reference types="vite/client" />

// React 19 moved the JSX namespace under React.JSX.
// Many files still reference the global JSX namespace (e.g. `JSX.Element`).
// Re-export it globally so existing code continues to type-check.
import type { JSX as ReactJSX } from "react";

declare global {
  namespace JSX {
    type Element = ReactJSX.Element;
    type ElementClass = ReactJSX.ElementClass;
    type ElementAttributesProperty = ReactJSX.ElementAttributesProperty;
    type ElementChildrenAttribute = ReactJSX.ElementChildrenAttribute;
    type LibraryManagedAttributes<C, P> = ReactJSX.LibraryManagedAttributes<C, P>;
    type IntrinsicAttributes = ReactJSX.IntrinsicAttributes;
    type IntrinsicClassAttributes<T> = ReactJSX.IntrinsicClassAttributes<T>;
    type IntrinsicElements = ReactJSX.IntrinsicElements;
  }
}

// Vitest globals — test files use `describe`, `it`, `expect`, `vi`, etc.
// without importing them. This declaration makes them available globally.
declare global {
  const describe: typeof import("vitest")["describe"];
  const it: typeof import("vitest")["it"];
  const test: typeof import("vitest")["test"];
  const expect: typeof import("vitest")["expect"];
  const vi: typeof import("vitest")["vi"];
  const beforeEach: typeof import("vitest")["beforeEach"];
  const afterEach: typeof import("vitest")["afterEach"];
  const beforeAll: typeof import("vitest")["beforeAll"];
  const afterAll: typeof import("vitest")["afterAll"];
  const mock: typeof import("vitest")["vi"]["mock"];
}

// subscribeToPushNotifications is injected by a service worker script
declare function subscribeToPushNotifications(): Promise<void>;

// Custom window properties used by the app
interface Window {
  __OPENSIN_UPLOAD_TIMEOUT_MS__?: number;
}

export {};
