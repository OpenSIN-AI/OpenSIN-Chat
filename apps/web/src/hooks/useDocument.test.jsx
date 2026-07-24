// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

// Mock the model layer so the hook is tested in isolation.
vi.mock("@/models/workspace", () => ({
  default: {
    getParsedFiles: vi.fn(),
  },
}));

import Workspace from "@/models/workspace";
import useDocument, { workspaceDocumentKey } from "./useDocument";

// Each test gets a fresh, isolated SWR cache and de-duping disabled so calls
// are deterministic.
function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useDocument", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds a scoped cache key and returns null for a missing slug", () => {
    expect(workspaceDocumentKey("foo")).toEqual([
      "workspace-documents",
      "foo",
      null,
    ]);
    expect(workspaceDocumentKey("foo", "bar")).toEqual([
      "workspace-documents",
      "foo",
      "bar",
    ]);
    expect(workspaceDocumentKey(undefined)).toBeNull();
  });

  it("fetches parsed files for a workspace", async () => {
    const fixture = {
      files: [{ id: 1, title: "doc1" }],
      contextWindow: 4096,
      currentContextTokenCount: 1024,
    };
    Workspace.getParsedFiles.mockResolvedValue(fixture);

    const { result } = renderHook(() => useDocument("foo"), { wrapper });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.document).toEqual(fixture);
    expect(Workspace.getParsedFiles).toHaveBeenCalledWith("foo", null);
  });

  it("fetches parsed files for a workspace thread", async () => {
    const fixture = {
      files: [],
      contextWindow: 4096,
      currentContextTokenCount: 0,
    };
    Workspace.getParsedFiles.mockResolvedValue(fixture);

    const { result } = renderHook(() => useDocument("foo", "bar"), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(Workspace.getParsedFiles).toHaveBeenCalledWith("foo", "bar");
  });

  it("does not fetch when slug is falsy (conditional fetching)", async () => {
    const { result } = renderHook(() => useDocument(null), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.document).toBeNull();
    expect(Workspace.getParsedFiles).not.toHaveBeenCalled();
  });
});
