// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { SWRConfig } from "swr";

// Mock the model layer so the hook is tested in isolation.
vi.mock("@/models/system", () => ({
  default: {
    localFiles: vi.fn(),
  },
}));

vi.mock("@/models/workspace", () => ({
  default: {
    uploadFile: vi.fn(),
    bySlug: vi.fn(),
  },
}));

import System from "@/models/system";
import Workspace from "@/models/workspace";
import useDocuments, { useDocument, useDocumentUpload } from "./useDocuments";

// Each test gets a fresh, isolated SWR cache and de-duping disabled so calls
// are deterministic.
function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useDocuments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns documents from System.localFiles()", async () => {
    const fixture = {
      items: [
        {
          name: "custom-documents",
          type: "folder",
          items: [{ id: 1, name: "doc1.txt", type: "file" }],
        },
      ],
    };
    System.localFiles.mockResolvedValue(fixture);

    const { result } = renderHook(() => useDocuments(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.documents).toEqual(fixture);
    expect(System.localFiles).toHaveBeenCalledTimes(1);
  });

  it("returns null documents when localFiles returns null", async () => {
    System.localFiles.mockResolvedValue(null);

    const { result } = renderHook(() => useDocuments(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.documents).toBeNull();
  });

  it("de-duplicates concurrent identical requests into one fetch", async () => {
    System.localFiles.mockResolvedValue({ items: [] });

    // Two hooks sharing one cache + a non-zero deduping interval should result
    // in a single underlying request.
    function sharedWrapper({ children }) {
      return (
        <SWRConfig
          value={{ provider: () => new Map(), dedupingInterval: 2000 }}
        >
          {children}
        </SWRConfig>
      );
    }

    const { result } = renderHook(
      () => ({ a: useDocuments(), b: useDocuments() }),
      { wrapper: sharedWrapper },
    );

    await waitFor(() => expect(result.current.a.isLoading).toBe(false));
    expect(System.localFiles).toHaveBeenCalledTimes(1);
  });
});

describe("useDocument", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("finds a single document by id from the cached list", async () => {
    const fixture = {
      items: [
        {
          name: "custom-documents",
          type: "folder",
          items: [
            { id: 42, name: "target.txt", type: "file" },
            { id: 2, name: "other.txt", type: "file" },
          ],
        },
      ],
    };
    System.localFiles.mockResolvedValue(fixture);

    const { result } = renderHook(() => useDocument(42), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.document).toEqual({
      id: 42,
      name: "target.txt",
      type: "file",
    });
  });

  it("returns null when id is not found", async () => {
    System.localFiles.mockResolvedValue({
      items: [
        {
          name: "custom-documents",
          type: "folder",
          items: [{ id: 1, name: "doc1.txt", type: "file" }],
        },
      ],
    });

    const { result } = renderHook(() => useDocument(999), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.document).toBeNull();
  });
});

describe("useDocumentUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uploads a file and returns the result", async () => {
    const uploadResult = {
      response: { ok: true },
      data: { id: 123 },
    };
    Workspace.uploadFile.mockResolvedValue(uploadResult);

    const { result } = renderHook(() => useDocumentUpload(), { wrapper });

    const formData = new FormData();
    formData.append("file", new Blob(["hello"]), "test.txt");

    let data;
    await act(async () => {
      data = await result.current.upload({ slug: "test-workspace", formData });
    });

    expect(data).toEqual(uploadResult);
    expect(Workspace.uploadFile).toHaveBeenCalledWith(
      "test-workspace",
      formData,
    );
  });
});
