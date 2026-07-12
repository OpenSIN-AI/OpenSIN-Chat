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

vi.mock("@/utils/safeStorage", () => ({
  safeGetItem: vi.fn(),
}));

import {
  baseHeaders,
  userFromStorage,
  safeJsonParse,
  safeErrorMessage,
} from "./request";
import { safeGetItem } from "@/utils/safeStorage";

describe("request utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("userFromStorage", () => {
    it("returns null when no user is stored", () => {
      safeGetItem.mockReturnValue(null);
      expect(userFromStorage()).toBeNull();
    });

    it("returns parsed user object when stored", () => {
      const user = { id: 1, username: "test" };
      safeGetItem.mockReturnValue(JSON.stringify(user));
      expect(userFromStorage()).toEqual(user);
    });

    it("returns null when stored value is invalid JSON", () => {
      safeGetItem.mockReturnValue("not-json{");
      expect(userFromStorage()).toBeNull();
    });
  });

  describe("baseHeaders", () => {
    it("returns Authorization header with token from storage", () => {
      safeGetItem.mockReturnValue("my-token");
      expect(baseHeaders()).toEqual({ Authorization: "Bearer my-token" });
    });

    it("returns empty object when no token", () => {
      safeGetItem.mockReturnValue(null);
      expect(baseHeaders()).toEqual({});
    });

    it("uses provided token over storage token", () => {
      safeGetItem.mockReturnValue("stored-token");
      expect(baseHeaders("provided-token")).toEqual({
        Authorization: "Bearer provided-token",
      });
    });
  });

  describe("safeJsonParse", () => {
    it("parses valid JSON", () => {
      expect(safeJsonParse('{"a":1}')).toEqual({ a: 1 });
    });

    it("returns fallback for invalid JSON", () => {
      expect(safeJsonParse("not-json", "fallback")).toBe("fallback");
    });

    it("returns fallback for null input", () => {
      expect(safeJsonParse(null, "fallback")).toBe("fallback");
    });

    it("returns fallback for undefined input", () => {
      expect(safeJsonParse(undefined, "fallback")).toBe("fallback");
    });

    it("defaults fallback to null", () => {
      expect(safeJsonParse("bad")).toBeNull();
    });

    it("parses arrays", () => {
      expect(safeJsonParse("[1,2,3]")).toEqual([1, 2, 3]);
    });
  });

  describe("safeErrorMessage", () => {
    it("extracts message from Error instances", () => {
      expect(safeErrorMessage(new Error("boom"))).toBe("boom");
    });

    it("returns string errors as-is", () => {
      expect(safeErrorMessage("plain string")).toBe("plain string");
    });

    it("extracts message from objects with message property", () => {
      expect(safeErrorMessage({ message: "obj error" })).toBe("obj error");
    });

    it("returns fallback for unknown types", () => {
      expect(safeErrorMessage(42, "fallback")).toBe("fallback");
    });

    it("uses default fallback", () => {
      expect(safeErrorMessage(42)).toBe("An unexpected error occurred");
    });
  });
});
