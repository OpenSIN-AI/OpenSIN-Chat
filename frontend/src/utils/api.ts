// SPDX-License-Identifier: MIT
/**
 * Typed API utilities for fetch-based operations.
 * Provides generic fetch functions with type safety.
 */

import type { ApiResponse } from "@/types/api";
import { ApiError } from "@/types/api";
import { baseHeaders } from "@/utils/request";

/**
 * Generic GET request with type safety
 */
export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: baseHeaders(),
    method: "GET",
    credentials: "include",
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
    headers: { "Content-Type": "application/json" },
    method: "POST",
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
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
    headers: { "Content-Type": "application/json" },
    method: "PUT",
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
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
    headers: baseHeaders(),
    method: "DELETE",
    credentials: "include",
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
