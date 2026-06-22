<!-- SPDX-License-Identifier: MIT -->

# `server/endpoints/api/enhancePrompt.js`

**Purpose:** Developer API endpoint for LLM-based prompt enhancement.

**Docs:** `server/endpoints/api/enhancePrompt.js.doc.md`

## Overview

Implements `POST /api/enhance-prompt`. The route is registered under the
`/api` router, so the full production path is `POST /api/enhance-prompt`.

The endpoint takes a user prompt and an optional context string, sends a
structured request to the configured LLM provider, and returns a rewritten
version of the prompt. It is intended for programmatic use by integrations,
scripts, and other API consumers.

## Security controls

- **Authentication:** protected by `validApiKey` (same middleware as the other
  `/api/v1/*` developer API endpoints). In `NODE_ENV=test` with
  `INTEGRATION_TEST=true` the middleware bypasses key validation so the
  integration suites can exercise the route without a real API key.
- **Rate limiting:** `simpleRateLimit` bucket `enhance-prompt`, 10 requests per
  minute.
- **Input validation:** rejects missing/blank/non-string prompts, overlong
  prompts (> 5000 chars), and invalid context. Extra JSON fields are ignored.
- **Output sanitization:** the LLM response is passed through
  `extractEnhancedPrompt`, which strips chain-of-thought tags, reasoning
  prefixes, and meta-commentary before returning the result. If the response
  cannot be cleaned, the original prompt is returned instead — the API never
  leaks the model's internal instructions.

## Request / response

- **Method:** `POST`
- **Body:** `{ "prompt": string, "context"?: string }`
- **Success:** `200 OK`
  - `{ "enhancedPrompt": string, "originalPrompt": string }`
  - When no LLM is configured or the response is empty/unparseable:
    `{ "enhancedPrompt": string, "originalPrompt": string, "note": string }`
- **Client errors:**
  - `400 Bad Request` for malformed input.
  - `403 Forbidden` for missing/invalid API key.

## Response-fallback behavior

If `getLLMProvider()` throws (no provider configured), the endpoint returns
the original prompt unchanged with an explanatory note. If the LLM returns an
empty, whitespace-only, or purely reasoning response, the endpoint similarly
falls back to the original prompt rather than leaking the model's internal
monologue.

## Testing

Unit tests live in `server/__tests__/endpoints/api/enhancePrompt.test.js`. The
test harness mocks `validApiKey` and `simpleRateLimit` so only the final
route handler is exercised.
