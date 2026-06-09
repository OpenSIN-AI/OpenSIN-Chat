// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import React from "react";
import StorageFiles, { useGeneratedFiles } from "./files";

vi.mock("@/utils/constants", () => ({ API_BASE: "/api" }));
vi.mock("@/utils/request", () => ({
  baseHeaders: () => ({ "Content-Type": "application/json" }),
}));

describe("StorageFiles", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("download", () => {
    it("sends GET and returns blob on success", async () => {
      const blob = new Blob(["file content"], { type: "text/plain" });
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(blob),
      });

      const result = await StorageFiles.download("report.pdf");
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/agent-skills/generated-files/report.pdf",
        { headers: { "Content-Type": "application/json" } },
      );
      expect(result).toBeInstanceOf(Blob);
    });

    it("encodes the filename with encodeURIComponent", async () => {
      const blob = new Blob(["data"]);
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(blob),
      });

      await StorageFiles.download("my file.pdf");
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/agent-skills/generated-files/my%20file.pdf",
        { headers: { "Content-Type": "application/json" } },
      );
    });

    it("returns null when res.ok is false", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: false,
      });
      vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await StorageFiles.download("missing.txt");
      expect(result).toBeNull();
    });

    it("returns null on fetch error", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("net fail"));
      vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await StorageFiles.download("x.pdf");
      expect(result).toBeNull();
    });
  });
});

describe("useGeneratedFiles", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createWrapper() {
    return function Wrapper({ children }) {
      return React.createElement(SWRConfig, { value: { dedupingInterval: 0, provider: () => new Map() } }, children);
    };
  }

  it("fetches files and returns them", async () => {
    const filesData = { files: [{ name: "a.txt" }, { name: "b.txt" }] };
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(filesData),
    });

    const { result } = renderHook(() => useGeneratedFiles(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.files).toEqual([{ name: "a.txt" }, { name: "b.txt" }]);
    expect(result.current.error).toBeUndefined();
  });

  it("returns empty array when data has no files field", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    const { result } = renderHook(() => useGeneratedFiles(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.files).toEqual([]);
  });

  it("sets error when fetch fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useGeneratedFiles(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.error).toBeDefined());
    expect(result.current.files).toEqual([]);
  });

  it("exposes refresh via mutate", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ files: [] }),
    });

    const { result } = renderHook(() => useGeneratedFiles(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(typeof result.current.refresh).toBe("function");
  });
});
