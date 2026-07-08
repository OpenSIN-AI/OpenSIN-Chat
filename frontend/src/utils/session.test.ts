// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/utils/constants", () => ({
  API_BASE: "/api",
  AUTH_USER: "opensin_user",
  AUTH_TOKEN: "opensin_authToken",
  AUTH_TIMESTAMP: "opensin_authTimestamp",
  COMPLETE_QUESTIONNAIRE: "opensin_completed_questionnaire",
  SEEN_DOC_PIN_ALERT: "opensin_pinned_document_alert",
  SEEN_WATCH_ALERT: "opensin_watched_document_alert",
  LAST_VISITED_WORKSPACE: "opensin_last_visited_workspace",
  USER_PROMPT_INPUT_MAP: "opensin_user_prompt_input_map",
  PENDING_HOME_MESSAGE: "opensin_pending_home_message",
  APPEARANCE_SETTINGS: "opensin_appearance_settings",
  THEME_KEY: "opensin_theme",
  LEGACY_THEME_KEY: "theme",
  RESET_TOKEN: "opensin_resetToken",
  LEGACY_KEY_MAP: {},
  OLLAMA_COMMON_URLS: [],
  LMSTUDIO_COMMON_URLS: [],
  LOCALAI_COMMON_URLS: [],
  NVIDIA_NIM_COMMON_URLS: [],
  DOCKER_MODEL_RUNNER_COMMON_URLS: [],
  POPUP_BROWSER_EXTENSION_EVENT: "NEW_BROWSER_EXTENSION_CONNECTION",
  fullApiUrl: vi.fn(() => "http://localhost:3000/api"),
}));

vi.mock("./request", () => ({
  baseHeaders: vi.fn(() => ({ Authorization: "Bearer token" })),
}));

import validateSessionTokenForUser from "./session";

describe("session utility", () => {
  let originalFetch;

  beforeEach(() => {
    vi.clearAllMocks();
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("returns true when fetch returns 200", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response("{}", { status: 200 }),
    );
    const result = await validateSessionTokenForUser();
    expect(result).toBe(true);
  });

  it("returns false when fetch returns non-200 status", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response("{}", { status: 401 }),
    );
    const result = await validateSessionTokenForUser();
    expect(result).toBe(false);
  });

  it("returns false when fetch throws", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
    const result = await validateSessionTokenForUser();
    expect(result).toBe(false);
  });

  it("sends GET request with base headers to check-token endpoint", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response("{}", { status: 200 }),
    );
    await validateSessionTokenForUser();
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/system/check-token",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer token",
        }),
      }),
    );
  });
});
