// SPDX-License-Identifier: MIT
/**
 * Tests for untested utility functions from utils/http/index.js:
 * parseAuthHeader, reqBody, queryParams, multiUserMode.
 */
const {
  parseAuthHeader,
  reqBody,
  queryParams,
  multiUserMode,
} = require("../../../utils/http");

describe("parseAuthHeader", () => {
  test("returns Authorization Bearer header when headerValue is 'Authorization'", () => {
    const result = parseAuthHeader("Authorization", "my-api-key");
    expect(result).toEqual({ Authorization: "Bearer my-api-key" });
  });

  test("returns custom header with api key when headerValue is not 'Authorization'", () => {
    const result = parseAuthHeader("x-api-key", "my-key");
    expect(result).toEqual({ "x-api-key": "my-key" });
  });

  test("returns empty object when headerValue is null", () => {
    expect(parseAuthHeader(null, "key")).toEqual({});
  });

  test("returns empty object when apiKey is null", () => {
    expect(parseAuthHeader("Authorization", null)).toEqual({});
  });

  test("returns empty object when both are null", () => {
    expect(parseAuthHeader(null, null)).toEqual({});
  });

  test("handles empty string headerValue", () => {
    const result = parseAuthHeader("", "key");
    expect(result).toEqual({ "": "key" });
  });

  test("handles special characters in apiKey", () => {
    const result = parseAuthHeader("Authorization", "sk-abc123_xyz");
    expect(result).toEqual({ Authorization: "Bearer sk-abc123_xyz" });
  });
});

describe("reqBody", () => {
  test("parses valid JSON string body", () => {
    const req = { body: '{"key":"value"}' };
    expect(reqBody(req)).toEqual({ key: "value" });
  });

  test("returns empty object for invalid JSON string", () => {
    const req = { body: "not json" };
    expect(reqBody(req)).toEqual({});
  });

  test("returns object body directly (no string parsing)", () => {
    const req = { body: { key: "value" } };
    expect(reqBody(req)).toEqual({ key: "value" });
  });

  test("returns array body directly", () => {
    const req = { body: [1, 2, 3] };
    expect(reqBody(req)).toEqual([1, 2, 3]);
  });

  test("returns null body directly", () => {
    const req = { body: null };
    expect(reqBody(req)).toBeNull();
  });

  test("returns undefined body directly", () => {
    const req = { body: undefined };
    expect(reqBody(req)).toBeUndefined();
  });

  test("returns empty string body as empty object", () => {
    const req = { body: "" };
    // empty string is a string, JSON.parse("") throws, so returns {}
    expect(reqBody(req)).toEqual({});
  });

  test("handles number string body gracefully", () => {
    const req = { body: "42" };
    // JSON.parse("42") === 42 (valid JSON primitive)
    expect(reqBody(req)).toBe(42);
  });

  test("handles deeply nested JSON", () => {
    const req = { body: '{"a":{"b":{"c":[1,2,3]}}}' };
    expect(reqBody(req)).toEqual({ a: { b: { c: [1, 2, 3] } } });
  });
});

describe("queryParams", () => {
  test("returns request.query directly", () => {
    const req = { query: { foo: "bar", baz: "qux" } };
    expect(queryParams(req)).toEqual({ foo: "bar", baz: "qux" });
  });

  test("returns undefined when query is not set", () => {
    const req = {};
    expect(queryParams(req)).toBeUndefined();
  });

  test("returns empty object for empty query", () => {
    const req = { query: {} };
    expect(queryParams(req)).toEqual({});
  });

  test("preserves array query params", () => {
    const req = { query: { ids: ["1", "2", "3"] } };
    expect(queryParams(req)).toEqual({ ids: ["1", "2", "3"] });
  });
});

describe("multiUserMode", () => {
  test("returns true when locals.multiUserMode is true", () => {
    const res = { locals: { multiUserMode: true } };
    expect(multiUserMode(res)).toBe(true);
  });

  test("returns false when locals.multiUserMode is false", () => {
    const res = { locals: { multiUserMode: false } };
    expect(multiUserMode(res)).toBe(false);
  });

  test("returns undefined when response is null", () => {
    expect(multiUserMode(null)).toBeUndefined();
  });

  test("returns undefined when response has no locals", () => {
    expect(multiUserMode({})).toBeUndefined();
  });

  test("returns undefined when locals.multiUserMode is not set", () => {
    const res = { locals: {} };
    expect(multiUserMode(res)).toBeUndefined();
  });
});
