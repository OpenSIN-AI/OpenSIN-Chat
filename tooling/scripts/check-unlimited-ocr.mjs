// SPDX-License-Identifier: MIT
// Purpose: Verify a live Unlimited-OCR OpenAI-compatible endpoint end to end.

import fs from "node:fs/promises";
import process from "node:process";
import { pathToFileURL } from "node:url";

const DEFAULT_BASE_URL = "http://127.0.0.1:18080/v1";
const DEFAULT_EXPECTED = ["OPEN", "SIN", "OCR", "2026"];
const FIXTURE_URL = new URL(
  "./fixtures/unlimited-ocr-smoke.png",
  import.meta.url,
);

export function normalizeBaseUrl(value) {
  return String(value || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

function responseText(data) {
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) =>
      typeof part === "string"
        ? part
        : typeof part?.text === "string"
          ? part.text
          : "",
    )
    .join("");
}

function normalizedOcrText(value) {
  return String(value || "")
    .replace(/<\|ref\|>([\s\S]*?)<\|\/ref\|>/g, "$1")
    .replace(/<\|det\|>[\s\S]*?<\|\/det\|>/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

async function requestJson(fetchImpl, url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      ...options,
      signal: controller.signal,
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`HTTP ${response.status}: ${body.slice(0, 300)}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function checkUnlimitedOcr({
  env = process.env,
  fetchImpl = globalThis.fetch,
  fixtureUrl = FIXTURE_URL,
  healthOnly = false,
} = {}) {
  if (typeof fetchImpl !== "function") {
    throw new Error("A fetch-compatible Node.js runtime is required");
  }

  const baseUrl = normalizeBaseUrl(env.UNLIMITED_OCR_BASE_URL);
  const apiKey = env.UNLIMITED_OCR_API_KEY || "";
  const model = env.UNLIMITED_OCR_MODEL || "baidu/Unlimited-OCR";
  const timeoutMs = Number(env.UNLIMITED_OCR_CHECK_TIMEOUT_MS || 120_000);
  const headers = { Accept: "application/json" };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const startedAt = Date.now();
  const models = await requestJson(
    fetchImpl,
    `${baseUrl}/models`,
    { headers },
    Math.min(timeoutMs, 30_000),
  );

  const result = {
    ok: true,
    baseUrl,
    model,
    availableModels: Array.isArray(models?.data)
      ? models.data.map((entry) => entry?.id).filter(Boolean)
      : [],
    healthOnly,
  };
  if (healthOnly) return { ...result, elapsedMs: Date.now() - startedAt };

  const image = await fs.readFile(fixtureUrl);
  const payload = {
    model,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "<image>document parsing." },
          {
            type: "image_url",
            image_url: {
              url: `data:image/png;base64,${image.toString("base64")}`,
            },
          },
        ],
      },
    ],
    max_tokens: 2048,
    temperature: 0,
    skip_special_tokens: false,
    vllm_xargs: { ngram_size: 35, window_size: 128 },
  };
  const completion = await requestJson(
    fetchImpl,
    `${baseUrl}/chat/completions`,
    {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    timeoutMs,
  );
  const text = responseText(completion);
  const normalized = normalizedOcrText(text);
  const expected = String(env.UNLIMITED_OCR_CHECK_EXPECTED || "")
    .split(",")
    .map((token) => token.trim().toUpperCase())
    .filter(Boolean);
  const required = expected.length ? expected : DEFAULT_EXPECTED;
  const missing = required.filter((token) => !normalized.includes(token));
  if (missing.length) {
    throw new Error(
      `OCR response missed expected tokens: ${missing.join(", ")}; response=${text.slice(0, 500)}`,
    );
  }

  return {
    ...result,
    elapsedMs: Date.now() - startedAt,
    matchedTokens: required,
    responsePreview: text.slice(0, 500),
  };
}

async function main() {
  const healthOnly = process.argv.includes("--health-only");
  try {
    const result = await checkUnlimitedOcr({ healthOnly });
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(`[Unlimited-OCR check] ${error.message}`);
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await main();
}
