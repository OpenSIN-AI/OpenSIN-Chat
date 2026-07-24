// SPDX-License-Identifier: MIT
import assert from "node:assert/strict";
import test from "node:test";
import { checkUnlimitedOcr, normalizeBaseUrl } from "./check-unlimited-ocr.mjs";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("normalizes endpoint URLs", () => {
  assert.equal(normalizeBaseUrl("http://ocr.test/v1///"), "http://ocr.test/v1");
});

test("checks model health and performs a real OCR-shaped request", async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });
    if (url.endsWith("/models")) {
      return jsonResponse({ data: [{ id: "baidu/Unlimited-OCR" }] });
    }
    return jsonResponse({
      choices: [{ message: { content: "OPEN SIN OCR 2026" } }],
    });
  };

  const result = await checkUnlimitedOcr({
    env: {
      UNLIMITED_OCR_BASE_URL: "http://ocr.test/v1",
      UNLIMITED_OCR_API_KEY: "secret",
    },
    fetchImpl,
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.matchedTokens, ["OPEN", "SIN", "OCR", "2026"]);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].options.headers.Authorization, "Bearer secret");
  const payload = JSON.parse(calls[1].options.body);
  assert.equal(payload.messages[0].content[0].text, "<image>document parsing.");
  assert.equal(payload.skip_special_tokens, false);
  assert.deepEqual(payload.vllm_xargs, { ngram_size: 35, window_size: 128 });
});

test("health-only mode does not submit a completion", async () => {
  let calls = 0;
  const result = await checkUnlimitedOcr({
    env: { UNLIMITED_OCR_BASE_URL: "http://ocr.test/v1" },
    fetchImpl: async () => {
      calls += 1;
      return jsonResponse({ data: [] });
    },
    healthOnly: true,
  });
  assert.equal(result.healthOnly, true);
  assert.equal(calls, 1);
});
