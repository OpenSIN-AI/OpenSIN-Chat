// SPDX-License-Identifier: MIT
/**
 * Typed API utilities for fetch-based operations.
 * Provides generic fetch functions with type safety.
 */

import type { ApiResponse } from "@/types/api";
import { ApiError } from "@/types/api";
import { baseHeaders } from "@/utils/request";
import { fetchWithTimeout } from "@/utils/fetchWithTimeout";

const STATUS_MESSAGES: Record<number, string> = {
  400: "Bad request — the server could not process your request.",
  401: "Please log in to continue.",
  403: "You don't have permission to perform this action.",
  404: "The requested resource was not found.",
  408: "The request timed out. Please try again.",
  409: "This action conflicts with existing data.",
  413: "The uploaded file is too large.",
  422: "The submitted data failed validation.",
  429: "Too many requests — please wait a moment and try again.",
  500: "Something went wrong on the server. Please try again later.",
  502: "The server is temporarily unavailable.",
  503: "The service is temporarily unavailable.",
  504: "The server did not respond in time. Please try again.",
};

function friendlyError(status: number, errorText: string): ApiError {
  const fallback = STATUS_MESSAGES[status];
  if (fallback && (!errorText || errorText.length < 5)) {
    return new ApiError(status, fallback);
  }
  if (fallback) {
    return new ApiError(status, `${fallback} (${errorText})`);
  }
  return new ApiError(status, `HTTP ${status}: ${errorText}`);
}

/**
 * Generic GET request with type safety
 */
export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetchWithTimeout(url, {
    headers: baseHeaders(),
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw friendlyError(res.status, errorText);
  }

  return res.json() as Promise<T>;
}

/**
 * Generic POST request with type safety
 */
export async function apiPost<T>(url: string, data?: any): Promise<T> {
  const res = await fetchWithTimeout(url, {
    headers: { ...baseHeaders(), "Content-Type": "application/json" },
    method: "POST",
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw friendlyError(res.status, errorText);
  }

  return res.json() as Promise<T>;
}

/**
 * Generic PUT request with type safety
 */
export async function apiPut<T>(url: string, data?: any): Promise<T> {
  const res = await fetchWithTimeout(url, {
    headers: { ...baseHeaders(), "Content-Type": "application/json" },
    method: "PUT",
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw friendlyError(res.status, errorText);
  }

  return res.json() as Promise<T>;
}

/**
 * Generic DELETE request with type safety
 */
export async function apiDelete<T = void>(url: string): Promise<T> {
  const res = await fetchWithTimeout(url, {
    headers: baseHeaders(),
    method: "DELETE",
    credentials: "include",
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw friendlyError(res.status, errorText);
  }

  const contentType = res.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return res.json() as Promise<T>;
  }

  return undefined as T;
}

/**
 * Wrap API calls with standard error handling
 */
export async function apiCall<T>(
  fn: () => Promise<T>,
): Promise<ApiResponse<T>> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (err) {
    if (err instanceof ApiError) {
      return { success: false, error: err.message, status: err.status };
    }
    return { success: false, error: String(err) };
  }
}
