// SPDX-License-Identifier: MIT

const MAX_DESCRIPTION_LENGTH = 140;

const SAFE_KEYS = ["query", "url", "path", "filename", "file", "command", "repository", "repo", "title", "subject"];

function truncate(value: string): string {
  if (value.length <= MAX_DESCRIPTION_LENGTH) return value;
  return `${value.slice(0, MAX_DESCRIPTION_LENGTH - 1)}…`;
}

function safeString(value: unknown): string | null {
  if (typeof value === "string") return truncate(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}

function describeSearch(args: Record<string, unknown>): string | null {
  const query = safeString(args.query) || safeString(args.search_query) || safeString(args.q);
  return query;
}

function describeCommand(args: Record<string, unknown>): string | null {
  return safeString(args.command) || safeString(args.cmd) || safeString(args.script);
}

function describeFile(args: Record<string, unknown>): string | null {
  return safeString(args.path) || safeString(args.filepath) || safeString(args.filename);
}

export function describeToolArgs(args?: Record<string, unknown>): string | undefined {
  if (!args) return undefined;

  const specialized = describeSearch(args) || describeCommand(args) || describeFile(args);
  if (specialized) return specialized;

  for (const key of SAFE_KEYS) {
    const value = safeString(args[key]);
    if (value) return value;
  }
  return undefined;
}
