// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

vi.mock("@/utils/request", () => ({
  baseHeaders: vi.fn(() => ({ Authorization: "Bearer token" })),
}));

import useAuthenticatedBlobUrl from "./useAuthenticatedBlobUrl";

describe("useAuthenticatedBlobUrl", () => {
  let originalFetch;
  let originalCreateObjectURL;
  let originalRevokeObjectURL;

  beforeEach(() => {
    vi.clearAllMocks();
    originalFetch = global.fetch;
    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn(() => "blob:test-url");
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it("returns null blobUrl and no error when url is not provided", () => {
    const { result } = renderHook(() => useAuthenticatedBlobUrl(null));
    expect(result.current.blobUrl).toBeNull();
    expect(result.current.error).toBe(false);
  });

  it("returns null blobUrl and no error when url is undefined", () => {
    const { result } = renderHook(() => useAuthenticatedBlobUrl(undefined));
    expect(result.current.blobUrl).toBeNull();
    expect(result.current.error).toBe(false);
  });

  it("fetches the URL with auth headers and creates blob URL", async () => {
    const blob = new Blob(["test"], { type: "text/plain" });
    global.fetch = vi
      .fn()
      .mockResolvedValue(new Response(blob, { status: 200 }));
    const { result } = renderHook(() => useAuthenticatedBlobUrl("/api/file/1"));
    await waitFor(() => expect(result.current.blobUrl).toBe("blob:test-url"));
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/file/1",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer token",
        }),
      }),
    );
  });

  it("sets error to true when fetch returns non-ok response", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(new Response("Not found", { status: 404 }));
    const { result } = renderHook(() => useAuthenticatedBlobUrl("/api/file/1"));
    await waitFor(() => expect(result.current.error).toBe(true));
    expect(result.current.blobUrl).toBeNull();
  });

  it("sets error to true when fetch throws", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network"));
    const { result } = renderHook(() => useAuthenticatedBlobUrl("/api/file/1"));
    await waitFor(() => expect(result.current.error).toBe(true));
  });

  it("loading is true when url is provided but not yet resolved", () => {
    global.fetch = vi.fn(() => new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useAuthenticatedBlobUrl("/api/file/1"));
    expect(result.current.loading).toBe(true);
    expect(result.current.blobUrl).toBeNull();
    expect(result.current.error).toBe(false);
  });

  it("loading is false when no url is provided", () => {
    const { result } = renderHook(() => useAuthenticatedBlobUrl(null));
    expect(result.current.loading).toBe(false);
  });
});
