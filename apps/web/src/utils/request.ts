// SPDX-License-Identifier: MIT
import { AUTH_TOKEN, AUTH_USER } from "./constants";
import { safeGetItem } from "./safeStorage";

// Sets up the base headers for authenticated requests.
export function userFromStorage<T = unknown>(): T | null {
  const userString = safeGetItem(AUTH_USER);
  if (!userString) return null;
  return safeJsonParse<T | null>(userString, null);
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

export function safeJsonParse<T = unknown>(
  jsonString: unknown,
  fallback: T = null as T,
): T {
  if (typeof jsonString !== "string") return fallback;

  try {
    return JSON.parse(jsonString) as T;
  } catch (error: unknown) {
    console.warn(
      "[request] Invalid JSON ignored:",
      error instanceof Error ? error.message : String(error),
    );
    return fallback;
  }
}

export function safeErrorMessage(
  error: unknown,
  fallback = "An unexpected error occurred",
): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }
  return fallback;
}
