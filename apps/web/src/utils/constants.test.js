// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../vitest.config", () => ({}));

const originalEnv = { ...import.meta.env };

beforeEach(() => {
  Object.assign(import.meta.env, originalEnv);
});

const {
  API_BASE,
  AUTH_USER,
  AUTH_TOKEN,
  AUTH_TIMESTAMP,
  COMPLETE_QUESTIONNAIRE,
  SEEN_DOC_PIN_ALERT,
  SEEN_WATCH_ALERT,
  LAST_VISITED_WORKSPACE,
  USER_PROMPT_INPUT_MAP,
  PENDING_HOME_MESSAGE,
  APPEARANCE_SETTINGS,
  OLLAMA_COMMON_URLS,
  LMSTUDIO_COMMON_URLS,
  LOCALAI_COMMON_URLS,
  NVIDIA_NIM_COMMON_URLS,
  DOCKER_MODEL_RUNNER_COMMON_URLS,
  fullApiUrl,
  POPUP_BROWSER_EXTENSION_EVENT,
} = await import("@/utils/constants");

describe("constants – localStorage keys", () => {
  const localStorageKeys = [
    AUTH_USER,
    AUTH_TOKEN,
    AUTH_TIMESTAMP,
    COMPLETE_QUESTIONNAIRE,
    SEEN_DOC_PIN_ALERT,
    SEEN_WATCH_ALERT,
    LAST_VISITED_WORKSPACE,
    USER_PROMPT_INPUT_MAP,
    PENDING_HOME_MESSAGE,
    APPEARANCE_SETTINGS,
  ];

  it("every localStorage key is a non-empty string", () => {
    localStorageKeys.forEach((key) => {
      expect(typeof key).toBe("string");
      expect(key.length).toBeGreaterThan(0);
    });
  });

  it("every localStorage key starts with opensin_ prefix", () => {
    localStorageKeys.forEach((key) => {
      expect(key).toMatch(/^opensin_/);
    });
  });
});

describe("constants – provider URL arrays", () => {
  it("OLLAMA_COMMON_URLS contains expected localhost entries", () => {
    expect(OLLAMA_COMMON_URLS).toContain("http://127.0.0.1:11434");
    expect(OLLAMA_COMMON_URLS).toContain("http://host.docker.internal:11434");
    expect(OLLAMA_COMMON_URLS).toContain("http://172.17.0.1:11434");
  });

  it("LMSTUDIO_COMMON_URLS contains expected localhost entries", () => {
    expect(LMSTUDIO_COMMON_URLS).toContain("http://localhost:1234/v1");
    expect(LMSTUDIO_COMMON_URLS).toContain("http://127.0.0.1:1234/v1");
  });

  it("LOCALAI_COMMON_URLS contains expected entries", () => {
    expect(LOCALAI_COMMON_URLS).toContain("http://127.0.0.1:8080/v1");
  });

  it("NVIDIA_NIM_COMMON_URLS contains expected entries", () => {
    expect(NVIDIA_NIM_COMMON_URLS).toContain(
      "http://127.0.0.1:8000/v1/version",
    );
  });

  it("DOCKER_MODEL_RUNNER_COMMON_URLS contains expected entries", () => {
    expect(DOCKER_MODEL_RUNNER_COMMON_URLS).toContain(
      "http://localhost:12434/engines/llama.cpp/v1",
    );
  });
});

describe("fullApiUrl", () => {
  it("returns origin + /api when API_BASE is /api", () => {
    const result = fullApiUrl();
    expect(result).toBe(`${window.location.origin}/api`);
  });
});

describe("POPUP_BROWSER_EXTENSION_EVENT", () => {
  it("is a non-empty string", () => {
    expect(typeof POPUP_BROWSER_EXTENSION_EVENT).toBe("string");
    expect(POPUP_BROWSER_EXTENSION_EVENT.length).toBeGreaterThan(0);
  });
});
