// SPDX-License-Identifier: MIT
import { AUTH_TOKEN, AUTH_USER } from "./constants";
import { safeGetItem } from "./safeStorage";

// Sets up the base headers for all authenticated requests so that we are able to prevent
// basic spoofing since a valid token is required and that cannot be spoofed
export function userFromStorage() {
  const userString = safeGetItem(AUTH_USER);
  if (!userString) return null;
  return safeJsonParse(userString, null);
}

export function baseHeaders(
  providedToken: string | null = null,
): Record<string, string> {
  const token = providedToken || safeGetItem(AUTH_TOKEN);
  if (!token) return {};
  return {
    Authorization: `Bearer ${token}`,
  };
}

export function safeJsonParse(jsonString, fallback = null) {
  try {
    if (jsonString === null || jsonString === undefined) return fallback;
    return JSON.parse(jsonString);
  } catch (e) {
    console.warn("[request] non-fatal error:", e?.message || e);
  }
  return fallback;
}

export function safeErrorMessage(
  e: unknown,
  fallback = "An unexpected error occurred",
) {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  if (e && typeof e === "object" && "message" in e) return String(e.message);
  return fallback;
}
