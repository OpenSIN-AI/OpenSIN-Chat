// SPDX-License-Identifier: MIT
const {
  routerClassifier,
  classifyWithLLM,
} = require("../../../../../utils/agents/aibitat/plugins/router-classifier");

jest.mock("../../../../../utils/agents/aibitat/index.js", () => {
  const mockFn = jest.fn();
  const mockUse = jest.fn();
  const mockAgent = jest.fn();
  const mockStart = jest.fn().mockResolvedValue(undefined);
  return jest.fn().mockImplementation(() => ({
    function: mockFn,
    use: mockUse,
    agent: mockAgent,
    start: mockStart,
  }));
});

describe("routerClassifier", () => {
  test("name is 'router-classifier'", () => {
    expect(routerClassifier.name).toBe("router-classifier");
  });

  test("plugin setup registers select_category function", () => {
    const aibitat = { function: jest.fn() };
    const plugin = routerClassifier.plugin({ categories: ["cat1"] });
    plugin.setup(aibitat);
    expect(aibitat.function).toHaveBeenCalledWith(
      expect.objectContaining({ name: "select_category" }),
    );
  });

  test("handler sets classifiedCategory and skipHandleExecution", async () => {
    const aibitat = { classifiedCategory: undefined, skipHandleExecution: false };
    let registeredHandler = null;
    aibitat.function = jest.fn((def) => {
      if (def.name === "select_category") registeredHandler = def.handler;
    });
    const plugin = routerClassifier.plugin({ categories: ["billing"] });
    plugin.setup(aibitat);
    const ctx = { super: aibitat };
    const result = await registeredHandler.call(ctx, { category: "billing" });
    expect(aibitat.classifiedCategory).toBe("billing");
    expect(aibitat.skipHandleExecution).toBe(true);
    expect(result).toBe("TERMINATE");
  });

  test("handler defaults to 'none' when no category provided", async () => {
    const aibitat = { classifiedCategory: undefined, skipHandleExecution: false };
    let handler = null;
    aibitat.function = jest.fn((def) => { if (def.name === "select_category") handler = def.handler; });
    routerClassifier.plugin({ categories: [] }).setup(aibitat);
    await handler.call({ super: aibitat }, {});
    expect(aibitat.classifiedCategory).toBe("none");
  });
});

describe("classifyWithLLM", () => {
  test("returns null for empty rules", async () => {
    expect(await classifyWithLLM([], "hello", {})).toBeNull();
  });

  test("returns null for empty prompt", async () => {
    expect(await classifyWithLLM([{ title: "t", description: "d" }], "", {})).toBeNull();
  });

  test("returns null for rules without descriptions", async () => {
    expect(await classifyWithLLM([{ title: "t" }], "hello", {})).toBeNull();
  });
});
