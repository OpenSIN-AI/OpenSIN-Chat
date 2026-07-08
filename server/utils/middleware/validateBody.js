// SPDX-License-Identifier: MIT
/**
 * Reusable Express middleware factory that validates `req.body` against a
 * Zod schema BEFORE the route handler runs.
 *
 * Usage:
 *   const { validateBody } = require("../utils/middleware/validateBody");
 *   const { WorkspaceSchemas } = require("../utils/validation/schemas");
 *
 *   app.post("/v1/workspace/new",
 *     [validApiKey, validateBody(WorkspaceSchemas.create)],
 *     async (request, response) => { ... }
 *   );
 *
 * On success the parsed (and coerced / defaulted) body replaces `request.body`
 * so downstream code can use it directly.  On failure a 400 JSON response is
 * sent with a `success: false` flag and a human-readable `error` string that
 * aggregates every field-level issue.
 *
 * The middleware is intentionally permissive about extra keys: schemas should
 * use `.passthrough()` or `.strip()` explicitly when they care — the default
 * Zod behaviour (strip unknown keys) is safe and predictable.
 */
const { z } = require('zod');

/**
 * @param {z.ZodSchema} schema – a Zod schema describing the expected body.
 * @param {object}      [opts]
 * @param {number}      [opts.status=400]  – HTTP status returned on validation failure.
 * @returns {import('express').RequestHandler}
 */
function validateBody(schema, opts = {}) {
  const { status = 400 } = opts;

  return function validatedBody(request, response, next) {
    // `reqBody()` in utils/http parses string bodies into objects; replicate
    // that here so the middleware works regardless of body-parser config.
    let body = request.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }
    if (body === null || body === undefined) body = {};

    const result = schema.safeParse(body);
    if (result.success) {
      // Replace request.body with the parsed & coerced value so handlers
      // receive typed, defaulted data.
      request.body = result.data;
      return next();
    }

    // Aggregate all field-level error messages into a single readable string.
    const issues = result.error.issues.map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join('.') : 'body';
      return `${path}: ${issue.message}`;
    });
    const error = issues.join('; ');

    return response.status(status).json({
      success: false,
      error: `Request body validation failed — ${error}`,
    });
  };
}

module.exports = { validateBody };
