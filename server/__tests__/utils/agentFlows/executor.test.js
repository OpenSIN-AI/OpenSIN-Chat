// SPDX-License-Identifier: MIT
const { FlowExecutor } = require("../../../utils/agentFlows/executor");

describe("FlowExecutor", () => {
  let executor;

  beforeEach(() => {
    executor = new FlowExecutor();
  });

  describe("constructor", () => {
    test("initializes with empty variables", () => {
      expect(executor.variables).toEqual({});
    });

    test("initializes aibitat as null", () => {
      expect(executor.aibitat).toBeNull();
    });
  });

  describe("attachLogging", () => {
    test("uses provided introspect and logger functions", () => {
      const introspect = jest.fn();
      const logger = jest.fn();
      executor.attachLogging(introspect, logger);
      expect(executor.introspect).toBe(introspect);
      expect(executor.logger).toBe(logger);
    });

    test("falls back to console functions when null provided", () => {
      executor.attachLogging(null, null);
      expect(typeof executor.introspect).toBe("function");
      expect(typeof executor.logger).toBe("function");
    });
  });

  describe("getValueFromPath", () => {
    test("returns empty string for empty obj", () => {
      expect(executor.getValueFromPath({}, "foo")).toBe("");
    });

    test("returns empty string for empty path", () => {
      expect(executor.getValueFromPath({ foo: "bar" }, "")).toBe("");
    });

    test("returns empty string for non-object obj", () => {
      expect(executor.getValueFromPath(null, "foo")).toBe("");
      expect(executor.getValueFromPath(undefined, "foo")).toBe("");
    });

    test("returns empty string for non-string path", () => {
      expect(executor.getValueFromPath({ foo: "bar" }, null)).toBe("");
      expect(executor.getValueFromPath({ foo: "bar" }, 123)).toBe("");
    });

    test("resolves simple dot notation", () => {
      expect(executor.getValueFromPath({ foo: "bar" }, "foo")).toBe("bar");
    });

    test("resolves nested dot notation", () => {
      const obj = { user: { name: "Alice", age: 30 } };
      expect(executor.getValueFromPath(obj, "user.name")).toBe("Alice");
      expect(executor.getValueFromPath(obj, "user.age")).toBe(30);
    });

    test("returns undefined for missing keys", () => {
      expect(executor.getValueFromPath({ foo: "bar" }, "missing")).toBeUndefined();
      expect(executor.getValueFromPath({ user: {} }, "user.name")).toBeUndefined();
    });

    test("handles bracket notation for arrays", () => {
      const obj = { items: ["a", "b", "c"] };
      expect(executor.getValueFromPath(obj, "items[0]")).toBe("a");
      expect(executor.getValueFromPath(obj, "items[1]")).toBe("b");
      expect(executor.getValueFromPath(obj, "items[2]")).toBe("c");
    });

    test("handles bracket notation with quoted keys", () => {
      const obj = { "key with spaces": "value" };
      expect(executor.getValueFromPath(obj, "['key with spaces']")).toBe("value");
    });

    test("returns undefined for non-array bracket notation with numeric key", () => {
      const obj = { items: "not an array" };
      expect(executor.getValueFromPath(obj, "items[0]")).toBeUndefined();
    });

    test("parses JSON string input", () => {
      expect(executor.getValueFromPath('{"foo":"bar"}', "foo")).toBe("bar");
    });

    test("returns undefined for unparseable JSON string", () => {
      expect(executor.getValueFromPath("not json", "foo")).toBe("");
    });

    test("handles complex nested paths", () => {
      const obj = {
        data: {
          users: [
            { name: "Alice", address: { city: "Berlin" } },
            { name: "Bob", address: { city: "Munich" } },
          ],
        },
      };
      expect(executor.getValueFromPath(obj, "data.users[0].name")).toBe("Alice");
      expect(executor.getValueFromPath(obj, "data.users[1].address.city")).toBe("Munich");
    });

    test("JSON stringifies objects", () => {
      const obj = { foo: { bar: "baz" } };
      const result = executor.getValueFromPath(obj, "foo");
      expect(result).toBe('{"bar":"baz"}');
    });
  });

  describe("replaceVariables", () => {
    beforeEach(() => {
      executor.variables = { name: "Alice", age: 30 };
    });

    test("replaces single variable in string", () => {
      const config = { greeting: "Hello ${name}" };
      const result = executor.replaceVariables(config);
      expect(result.greeting).toBe("Hello Alice");
    });

    test("replaces multiple variables in same string", () => {
      const config = { info: "${name} is ${age} years old" };
      const result = executor.replaceVariables(config);
      expect(result.info).toBe("Alice is 30 years old");
    });

    test("replaces variables in nested objects", () => {
      const config = {
        user: {
          profile: {
            name: "${name}",
            age: "${age}",
          },
        },
      };
      const result = executor.replaceVariables(config);
      expect(result.user.profile.name).toBe("Alice");
      expect(result.user.profile.age).toBe("30");
    });

    test("replaces variables in arrays", () => {
      const config = { items: ["${name}", "${age}"] };
      const result = executor.replaceVariables(config);
      expect(result.items).toEqual(["Alice", "30"]);
    });

    test("leaves unresolved variables as-is", () => {
      const config = { text: "Hello ${unknown}" };
      const result = executor.replaceVariables(config);
      expect(result.text).toBe("Hello ${unknown}");
    });

    test("preserves non-string values", () => {
      const config = { count: 42, flag: true, data: null };
      const result = executor.replaceVariables(config);
      expect(result.count).toBe(42);
      expect(result.flag).toBe(true);
      expect(result.data).toBeNull();
    });

    test("handles empty config", () => {
      const result = executor.replaceVariables({});
      expect(result).toEqual({});
    });
  });
});
