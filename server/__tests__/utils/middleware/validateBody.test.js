// SPDX-License-Identifier: MIT
/**
 * Unit tests for the validateBody middleware.
 * Tests the middleware in isolation using mock zod schemas.
 */

function mockSchema(shouldPass, parsedData, issues) {
  return {
    safeParse: () =>
      shouldPass
        ? { success: true, data: parsedData }
        : {
            success: false,
            error: {
              issues: issues || [{ path: ["field"], message: "is required" }],
            },
          },
  };
}

function mockRequest(body) {
  return { body };
}

function mockResponse() {
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(data) {
      res.body = data;
      return res;
    },
  };
  return res;
}

// We need to test the middleware without requiring zod (which may not be installed).
// We'll mock the require to avoid the zod dependency in the test environment.
jest.mock("zod", () => ({ z: {} }));

const { validateBody } = require("../../../utils/middleware/validateBody");

describe("validateBody middleware", () => {
  test("passes through and replaces request.body on valid input", () => {
    const schema = mockSchema(true, { name: "test" });
    const req = mockRequest({ name: "test" });
    const res = mockResponse();
    let nextCalled = false;

    validateBody(schema)(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(true);
    expect(req.body).toEqual({ name: "test" });
    expect(res.statusCode).toBeNull();
  });

  test("returns 400 with error on invalid input", () => {
    const schema = mockSchema(false, null, [
      { path: ["name"], message: "must be a non-empty string" },
    ]);
    const req = mockRequest({ name: "" });
    const res = mockResponse();
    let nextCalled = false;

    validateBody(schema)(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain("name");
    expect(res.body.error).toContain("must be a non-empty string");
  });

  test("handles string body by parsing JSON", () => {
    const schema = mockSchema(true, { name: "parsed" });
    const req = mockRequest(JSON.stringify({ name: "parsed" }));
    const res = mockResponse();
    let nextCalled = false;

    validateBody(schema)(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(true);
  });

  test("handles invalid JSON string body", () => {
    const schema = mockSchema(false, null);
    const req = mockRequest("{invalid");
    const res = mockResponse();
    let nextCalled = false;

    validateBody(schema)(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(400);
  });

  test("handles null body", () => {
    const schema = mockSchema(false, null);
    const req = mockRequest(null);
    const res = mockResponse();
    let nextCalled = false;

    validateBody(schema)(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(400);
  });

  test("aggregates multiple field errors", () => {
    const schema = mockSchema(false, null, [
      { path: ["name"], message: "is required" },
      { path: ["password"], message: "must be at least 8 characters" },
    ]);
    const req = mockRequest({});
    const res = mockResponse();

    validateBody(schema)(req, res, () => {});

    expect(res.body.error).toContain("name: is required");
    expect(res.body.error).toContain("password: must be at least 8 characters");
  });

  test("supports custom status code", () => {
    const schema = mockSchema(false, null);
    const req = mockRequest({});
    const res = mockResponse();

    validateBody(schema, { status: 422 })(req, res, () => {});

    expect(res.statusCode).toBe(422);
  });

  test("handles undefined body", () => {
    const schema = mockSchema(false, null);
    const req = mockRequest(undefined);
    const res = mockResponse();
    let nextCalled = false;

    validateBody(schema)(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(400);
  });
});
