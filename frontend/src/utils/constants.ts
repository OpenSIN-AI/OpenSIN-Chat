// SPDX-License-Identifier: MIT
export const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export const AUTH_USER = "opensin_user";
export const AUTH_TOKEN = "opensin_authToken";
export const AUTH_TIMESTAMP = "opensin_authTimestamp";
export const COMPLETE_QUESTIONNAIRE = "opensin_completed_questionnaire";
export const SEEN_DOC_PIN_ALERT = "opensin_pinned_document_alert";
export const SEEN_WATCH_ALERT = "opensin_watched_document_alert";
export const LAST_VISITED_WORKSPACE = "opensin_last_visited_workspace";
export const USER_PROMPT_INPUT_MAP = "opensin_user_prompt_input_map";
export const PENDING_HOME_MESSAGE = "opensin_pending_home_message";

export const APPEARANCE_SETTINGS = "opensin_appearance_settings";
export const THEME_KEY = "opensin_theme";
export const LEGACY_THEME_KEY = "theme";
export const RESET_TOKEN = "opensin_resetToken";

// Legacy key mapping for migration from openafd_ → opensin_ prefix.
// Used by safeStorage to transparently migrate old keys on first access.
export const LEGACY_KEY_MAP: Record<string, string> = {
  openafd_user: AUTH_USER,
  openafd_authToken: AUTH_TOKEN,
  openafd_authTimestamp: AUTH_TIMESTAMP,
  openafd_completed_questionnaire: COMPLETE_QUESTIONNAIRE,
  openafd_pinned_document_alert: SEEN_DOC_PIN_ALERT,
  openafd_watched_document_alert: SEEN_WATCH_ALERT,
  openafd_last_visited_workspace: LAST_VISITED_WORKSPACE,
  openafd_user_prompt_input_map: USER_PROMPT_INPUT_MAP,
  openafd_pending_home_message: PENDING_HOME_MESSAGE,
  openafd_appearance_settings: APPEARANCE_SETTINGS,
  openafd_theme: THEME_KEY,
  openafd_resetToken: RESET_TOKEN,
  openafd_text_size: "opensin_text_size",
  openafd_sidebar_toggle: "opensin_sidebar_toggle",
  openafd_sidebar_width: "opensin_sidebar_width",
  openafd_folder_collapse_state: "opensin_folder_collapse_state",
  openafd_show_chat_metrics: "opensin_show_chat_metrics",
  openafd_source_filter: "opensin_source_filter",
  openafd_experimental_feature_preview_unlocked: "opensin_experimental_feature_preview_unlocked",
  openafd_agent_mode: "opensin_agent_mode",
  openafd_tos_experimental_feature_set: "opensin_tos_experimental_feature_set",
};

export const OLLAMA_COMMON_URLS = [
  "http://127.0.0.1:11434",
  "http://host.docker.internal:11434",
  "http://172.17.0.1:11434",
];

export const LMSTUDIO_COMMON_URLS = [
  "http://localhost:1234/v1",
  "http://127.0.0.1:1234/v1",
  "http://host.docker.internal:1234/v1",
  "http://172.17.0.1:1234/v1",
];

export const LOCALAI_COMMON_URLS = [
  "http://127.0.0.1:8080/v1",
  "http://localhost:8080/v1",
  "http://host.docker.internal:8080/v1",
  "http://172.17.0.1:8080/v1",
];

export const NVIDIA_NIM_COMMON_URLS = [
  "http://127.0.0.1:8000/v1/version",
  "http://localhost:8000/v1/version",
  "http://host.docker.internal:8000/v1/version",
  "http://172.17.0.1:8000/v1/version",
];

export const DOCKER_MODEL_RUNNER_COMMON_URLS = [
  "http://localhost:12434/engines/llama.cpp/v1",
  "http://127.0.0.1:12434/engines/llama.cpp/v1",
  "http://model-runner.docker.internal/engines/llama.cpp/v1",
  "http://host.docker.internal:12434/engines/llama.cpp/v1",
  "http://172.17.0.1:12434/engines/llama.cpp/v1",
];

export function fullApiUrl(): string {
  if (API_BASE !== "/api") return API_BASE;
  return `${window.location.origin}/api`;
}

export const POPUP_BROWSER_EXTENSION_EVENT = "NEW_BROWSER_EXTENSION_CONNECTION";
