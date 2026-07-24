// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeAll } from "vitest";

// We capture the dompurify factory invocation so we can later inspect the
// instance methods the SUT calls on it. The factory returns a singleton
// object — that's the same shape DOMPurify uses in production.
// vi.mock is hoisted to the top of the file, so we must use vi.hoisted to
// create the shared mock handles before the factory runs.
const { factoryMock, instanceMock } = vi.hoisted(() => {
  const instance = {
    sanitize: vi.fn((html) => html),
    setConfig: vi.fn(),
    addHook: vi.fn(),
    removeHook: vi.fn(),
    removeAllHooks: vi.fn(),
  };
  const factory = vi.fn(() => instance);
  return { factoryMock: factory, instanceMock: instance };
});

vi.mock("dompurify", () => ({
  default: factoryMock,
}));

// Import AFTER the mock is registered so the SUT picks up our factory.
import DOMPurify from "./purify";

describe("chat/purify", () => {
  // The SUT's module-load side effects (createDOMPurify(window) +
  // setConfig(...)) run exactly once at import time. We snapshot the
  // factory + setConfig call state in beforeAll so we can assert on it
  // even though `clearMocks: true` wipes call history between tests.
  let factoryCallsAtImport;
  let setConfigCallsAtImport;

  beforeAll(() => {
    factoryCallsAtImport = factoryMock.mock.calls.slice();
    setConfigCallsAtImport = instanceMock.setConfig.mock.calls.slice();
  });

  it("initialises DOMPurify with the global window object at module load", () => {
    expect(factoryCallsAtImport.length).toBeGreaterThanOrEqual(1);
    expect(factoryCallsAtImport[0][0]).toBe(window);
  });

  it("applies a config that allows target and rel attributes on anchors at module load", () => {
    expect(setConfigCallsAtImport.length).toBeGreaterThanOrEqual(1);
    const configArg = setConfigCallsAtImport[0][0];
    expect(configArg).toHaveProperty("ADD_ATTR");
    expect(configArg.ADD_ATTR).toEqual(
      expect.arrayContaining(["target", "rel"]),
    );
  });

  it("exports the DOMPurify instance with a sanitize function", () => {
    expect(DOMPurify).toBeDefined();
    expect(typeof DOMPurify.sanitize).toBe("function");
  });

  it("DOMPurify.sanitize forwards html to the underlying implementation", () => {
    instanceMock.sanitize.mockClear();
    const html =
      '<a href="https://example.com" target="_blank" rel="noopener">x</a>';
    const result = DOMPurify.sanitize(html);
    expect(result).toBe(html);
    expect(instanceMock.sanitize).toHaveBeenCalledTimes(1);
    // The SUT should not synthesise new args — exactly the html we passed.
    expect(instanceMock.sanitize.mock.calls[0][0]).toBe(html);
  });

  it("DOMPurify.sanitize accepts an options argument", () => {
    instanceMock.sanitize.mockClear();
    DOMPurify.sanitize("<b>x</b>", { ALLOWED_TAGS: ["b"] });
    expect(instanceMock.sanitize).toHaveBeenCalledWith("<b>x</b>", {
      ALLOWED_TAGS: ["b"],
    });
  });

  it("DOMPurify.addHook and removeHook are exposed", () => {
    expect(typeof DOMPurify.addHook).toBe("function");
    expect(typeof DOMPurify.removeHook).toBe("function");
  });
});
