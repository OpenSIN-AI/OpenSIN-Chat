// SPDX-License-Identifier: MIT
/**
 * Generic API response types for fetch-based operations.
 */

export type ApiResponse<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string; status?: number; message?: string };

export interface ApiErrorResponse {
  error: string;
  status: number;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
