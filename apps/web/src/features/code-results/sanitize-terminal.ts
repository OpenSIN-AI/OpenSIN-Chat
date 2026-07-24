// SPDX-License-Identifier: MIT

const ANSI_ESCAPE_PATTERN =
  // eslint-disable-next-line no-control-regex
  /\u001B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g;

export function sanitizeTerminalOutput(value?: string): string {
  if (!value) return "";
  return value.replace(ANSI_ESCAPE_PATTERN, "").replace(/\r\n/g, "\n");
}
