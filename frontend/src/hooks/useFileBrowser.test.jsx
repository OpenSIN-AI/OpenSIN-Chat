// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

vi.mock("@/utils/constants", () => ({
  API_BASE: "http://localhost:3001/api",
}));

vi.mock("@/utils/request", () => ({
  baseHeaders: vi.fn(() => ({ Authorization: "Bearer test-token" })),
}));

import { useFileBrowser } from "./useFileBrowser";

function mockFetchResponse(data, ok = true) {
  return {
    ok,
    status: ok ? 200 : 400,
    json: () => Promise.resolve(data),
  };
}

describe("useFileBrowser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts with default state", () => {
    const { result } = renderHook(() => useFileBrowser());
    expect(result.current.currentPath).toBeNull();
    expect(result.current.items).toEqual([]);
    expect(result.current.parentPath).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.selectedFiles).toEqual([]);
  });

  it("browses a directory successfully", async () => {
    const dirData = {
      path: "/home/user",
      parent: "/home",
      items: [
        { name: "file.txt", type: "file", path: "/home/user/file.txt" },
        { name: "subdir", type: "dir", path: "/home/user/subdir" },
      ],
    };
    global.fetch.mockResolvedValueOnce(mockFetchResponse(dirData));

    const { result } = renderHook(() => useFileBrowser());

    await act(async () => {
      await result.current.browse("/home/user");
    });

    expect(result.current.currentPath).toBe("/home/user");
    expect(result.current.parentPath).toBe("/home");
    expect(result.current.items).toHaveLength(2);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.selectedFiles).toEqual([]);
  });

  it("sets error on browse failure", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ error: "Permission denied" }),
    });

    const { result } = renderHook(() => useFileBrowser());

    await act(async () => {
      await result.current.browse("/root");
    });

    expect(result.current.error).toBe("Permission denied");
    expect(result.current.loading).toBe(false);
    expect(result.current.currentPath).toBeNull();
  });

  it("sets generic HTTP error when json parse fails", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error("parse error")),
    });

    const { result } = renderHook(() => useFileBrowser());

    await act(async () => {
      await result.current.browse("/bad");
    });

    expect(result.current.error).toBe("HTTP 500");
  });

  it("navigateTo calls browse with target path", async () => {
    const dirData = { path: "/foo", parent: null, items: [] };
    global.fetch.mockResolvedValueOnce(mockFetchResponse(dirData));

    const { result } = renderHook(() => useFileBrowser());

    await act(async () => {
      await result.current.navigateTo("/foo");
    });

    expect(result.current.currentPath).toBe("/foo");
  });

  it("navigateUp browses the parent path", async () => {
    const dirData = { path: "/home/user", parent: "/home", items: [] };
    global.fetch.mockResolvedValueOnce(mockFetchResponse(dirData));

    const { result } = renderHook(() => useFileBrowser());

    await act(async () => {
      await result.current.browse("/home/user");
    });

    const parentData = { path: "/home", parent: null, items: [] };
    global.fetch.mockResolvedValueOnce(mockFetchResponse(parentData));

    await act(async () => {
      await result.current.navigateUp();
    });

    expect(result.current.currentPath).toBe("/home");
  });

  it("navigateUp does nothing when parentPath is null", () => {
    const { result } = renderHook(() => useFileBrowser());
    act(() => {
      result.current.navigateUp();
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("creates a directory", async () => {
    global.fetch.mockResolvedValueOnce(
      mockFetchResponse({ success: true, path: "/foo/newdir" }),
    );

    const { result } = renderHook(() => useFileBrowser());

    let res;
    await act(async () => {
      res = await result.current.createDirectory("newdir", "/foo");
    });

    expect(res).toEqual({ success: true, path: "/foo/newdir" });
    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:3001/api/utils/create-directory",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("createDirectory throws on HTTP error", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: "Invalid name" }),
    });

    const { result } = renderHook(() => useFileBrowser());

    await expect(
      act(async () => {
        await result.current.createDirectory("", "/foo");
      }),
    ).rejects.toThrow("Invalid name");
  });

  it("creates a file with content", async () => {
    global.fetch.mockResolvedValueOnce(
      mockFetchResponse({ success: true, path: "/foo/test.txt" }),
    );

    const { result } = renderHook(() => useFileBrowser());

    let res;
    await act(async () => {
      res = await result.current.createFile("test.txt", "/foo", "hello world");
    });

    expect(res).toEqual({ success: true, path: "/foo/test.txt" });
    const [, opts] = global.fetch.mock.calls[0];
    expect(JSON.parse(opts.body)).toEqual({
      name: "test.txt",
      parentPath: "/foo",
      content: "hello world",
    });
  });

  it("createFile defaults content to empty string", async () => {
    global.fetch.mockResolvedValueOnce(
      mockFetchResponse({ success: true }),
    );

    const { result } = renderHook(() => useFileBrowser());

    await act(async () => {
      await result.current.createFile("empty.txt", "/foo");
    });

    const [, opts] = global.fetch.mock.calls[0];
    expect(JSON.parse(opts.body).content).toBe("");
  });

  it("deletes an item", async () => {
    global.fetch.mockResolvedValueOnce(
      mockFetchResponse({ success: true }),
    );

    const { result } = renderHook(() => useFileBrowser());

    let res;
    await act(async () => {
      res = await result.current.deleteItem("/foo/test.txt");
    });

    expect(res).toEqual({ success: true });
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toBe("http://localhost:3001/api/utils/delete-item");
    expect(opts.method).toBe("DELETE");
  });

  it("deleteItem throws on HTTP error", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: "Not found" }),
    });

    const { result } = renderHook(() => useFileBrowser());

    await expect(
      act(async () => {
        await result.current.deleteItem("/foo/missing.txt");
      }),
    ).rejects.toThrow("Not found");
  });

  it("toggles file selection (add then remove)", () => {
    const { result } = renderHook(() => useFileBrowser());
    const file = { path: "/foo/a.txt", name: "a.txt" };

    act(() => result.current.toggleFileSelection(file));
    expect(result.current.selectedFiles).toHaveLength(1);

    act(() => result.current.toggleFileSelection(file));
    expect(result.current.selectedFiles).toHaveLength(0);
  });

  it("toggleFileSelection adds multiple files", () => {
    const { result } = renderHook(() => useFileBrowser());

    act(() => result.current.toggleFileSelection({ path: "/a", name: "a" }));
    act(() => result.current.toggleFileSelection({ path: "/b", name: "b" }));

    expect(result.current.selectedFiles).toHaveLength(2);
  });

  it("clearSelection empties the selected files", () => {
    const { result } = renderHook(() => useFileBrowser());

    act(() => result.current.toggleFileSelection({ path: "/a", name: "a" }));
    act(() => result.current.clearSelection());

    expect(result.current.selectedFiles).toEqual([]);
  });
});
