// SPDX-License-Identifier: MIT
/* eslint-env jest, node */

jest.mock("dotenv", () => ({
  config: jest.fn(),
}), { virtual: true });

const { reqBody, queryParams, validBaseUrl, getCollectorPort } = require("../../../utils/http");

describe("HTTP utilities", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("reqBody", () => {
    it("returns parsed body when request.body is a string", () => {
      const req = { body: '{"key":"value"}' };
      expect(reqBody(req)).toEqual({ key: "value" });
    });

    it("returns body directly when it is already an object", () => {
      const body = { key: "value" };
      expect(reqBody({ body })).toEqual({ key: "value" });
    });

    it("returns body directly when it is null", () => {
      expect(reqBody({ body: null })).toBeNull();
    });

    it("returns empty object on invalid JSON string", () => {
      expect(reqBody({ body: "{invalid" })).toEqual({});
    });
  });

  describe("queryParams", () => {
    it("returns the query property from the request", () => {
      const req = { query: { page: 1, limit: 10 } };
      expect(queryParams(req)).toEqual({ page: 1, limit: 10 });
    });

    it("returns undefined when no query property", () => {
      expect(queryParams({})).toBeUndefined();
    });
  });

  describe("validBaseUrl", () => {
    it("returns true for a valid http URL", () => {
      expect(validBaseUrl("http://example.com")).toBe(true);
    });

    it("returns true for a valid https URL", () => {
      expect(validBaseUrl("https://example.com/path")).toBe(true);
    });

    it("returns false for an invalid URL string", () => {
      expect(validBaseUrl("not-a-url")).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(validBaseUrl("")).toBe(false);
    });

    it("returns true for URL with port", () => {
      expect(validBaseUrl("http://localhost:3000")).toBe(true);
    });

    it("returns false for a bare hostname without protocol", () => {
      expect(validBaseUrl("example.com")).toBe(false);
    });
  });

  describe("getCollectorPort", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
      delete process.env.COLLECTOR_PORT;
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it("returns default port 8888 when COLLECTOR_PORT is not set", () => {
      expect(getCollectorPort()).toBe(8888);
    });

    it("returns the port from COLLECTOR_PORT env var", () => {
      process.env.COLLECTOR_PORT = "9999";
      expect(getCollectorPort()).toBe(9999);
    });

    it("returns default for a non-numeric COLLECTOR_PORT", () => {
      process.env.COLLECTOR_PORT = "abc";
      expect(getCollectorPort()).toBe(8888);
    });

    it("returns default for a negative port", () => {
      process.env.COLLECTOR_PORT = "-1";
      expect(getCollectorPort()).toBe(8888);
    });

    it("returns default for port zero", () => {
      process.env.COLLECTOR_PORT = "0";
      expect(getCollectorPort()).toBe(8888);
    });

    it("returns default for port above 65535", () => {
      process.env.COLLECTOR_PORT = "70000";
      expect(getCollectorPort()).toBe(8888);
    });

    it("returns default for a float port", () => {
      process.env.COLLECTOR_PORT = "8080.5";
      expect(getCollectorPort()).toBe(8888);
    });

    it("accepts valid upper-bound port 65535", () => {
      process.env.COLLECTOR_PORT = "65535";
      expect(getCollectorPort()).toBe(65535);
    });

    it("accepts valid port 1", () => {
      process.env.COLLECTOR_PORT = "1";
      expect(getCollectorPort()).toBe(1);
    });
  });
});
