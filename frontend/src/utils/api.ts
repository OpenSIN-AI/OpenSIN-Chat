// SPDX-License-Identifier: MIT
/**
 * Typed API utilities for fetch-based operations.
 * Provides generic fetch functions with type safety.
 */

import type { ApiResponse } from "@/types/api";
import { ApiError } from "@/types/api";

/**
 * Generic GET request with type safety
 */
export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    method: "GET",
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new ApiError(res.status, `HTTP ${res.status}: ${errorText}`);
  }

  return res.json() as Promise<T>;
}

/**
 * Generic POST request with type safety
 */
export async function apiPost<T>(url: string, data?: any): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new ApiError(res.status, `HTTP ${res.status}: ${errorText}`);
  }

  return res.json() as Promise<T>;
}

/**
 * Generic PUT request with type safety
 */
export async function apiPut<T>(url: string, data?: any): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new ApiError(res.status, `HTTP ${res.status}: ${errorText}`);
  }

  return res.json() as Promise<T>;
}

/**
 * Generic DELETE request with type safety
 */
export async function apiDelete<T = void>(url: string): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    method: "DELETE",
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new ApiError(res.status, `HTTP ${res.status}: ${errorText}`);
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
