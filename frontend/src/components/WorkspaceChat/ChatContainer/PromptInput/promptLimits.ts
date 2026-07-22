// SPDX-License-Identifier: MIT

export const PROMPT_INPUT_ID = "primary-prompt-input";

/** Matches the server-side CHAT_MESSAGE_MAX_LENGTH guard. */
export const PROMPT_INPUT_MAX_LENGTH = 32_000;

export function normalizePromptInput(value: unknown): string {
  return (typeof value === "string" ? value : String(value ?? "")).slice(
    0,
    PROMPT_INPUT_MAX_LENGTH,
  );
}
