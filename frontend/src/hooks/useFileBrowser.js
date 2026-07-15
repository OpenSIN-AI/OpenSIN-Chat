// SPDX-License-Identifier: MIT
import { useState, useCallback } from "react";
import { API_BASE } from "@/utils/constants";
import { baseHeaders } from "@/utils/request";

/**
 * File-browser hook backing the "Dateien" tab.
 *
 * `scope` selects the backend store:
 *   - "workspace" (default) → the shared uploads tree (`/utils/*`). The
 *     workspace view is a client-side filter over this same tree.
 *   - "global" → the deployment-wide global store (`/utils/global/*`), a real
 *     separate storage root (STORAGE_DIR/global) shared across all workspaces.
 */
export function useFileBrowser(scope = "workspace") {
  const [currentPath, setCurrentPath] = useState(null);
  const [items, setItems] = useState([]);
  const [parentPath, setParentPath] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);

  // Route prefix for the active scope. Global files live under /utils/global.
  const prefix = scope === "global" ? "/utils/global" : "/utils";

  const browse = useCallback(
    async (targetPath) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${API_BASE}${prefix}/browse-directory?path=${encodeURIComponent(targetPath || "")}`,
          { headers: baseHeaders() },
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `HTTP ${res.status}`);
        }
        const data = await res.json();
        setCurrentPath(data.path);
        setParentPath(data.parent);
        setItems(data.items);
        setSelectedFiles([]);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    },
    [prefix],
  );

  const navigateTo = useCallback((targetPath) => browse(targetPath), [browse]);

  const navigateUp = useCallback(() => {
    if (parentPath !== null) browse(parentPath);
  }, [parentPath, browse]);

  const createDirectory = useCallback(
    async (name, dirParentPath) => {
      const res = await fetch(`${API_BASE}${prefix}/create-directory`, {
        method: "POST",
        headers: { ...baseHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ name, parentPath: dirParentPath || "" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      return res.json();
    },
    [prefix],
  );

  const createFile = useCallback(
    async (name, dirParentPath, content = "") => {
      const res = await fetch(`${API_BASE}${prefix}/create-file`, {
        method: "POST",
        headers: { ...baseHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          parentPath: dirParentPath || "",
          content,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      return res.json();
    },
    [prefix],
  );

  const deleteItem = useCallback(
    async (itemPath) => {
      const res = await fetch(`${API_BASE}${prefix}/delete-item`, {
        method: "DELETE",
        headers: { ...baseHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ path: itemPath }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      return res.json();
    },
    [prefix],
  );

  const toggleFileSelection = useCallback((file) => {
    setSelectedFiles((prev) => {
      const exists = prev.find((f) => f.path === file.path);
      if (exists) return prev.filter((f) => f.path !== file.path);
      return [...prev, file];
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedFiles([]), []);

  return {
    currentPath,
    items,
    parentPath,
    loading,
    error,
    selectedFiles,
    browse,
    navigateTo,
    navigateUp,
    createDirectory,
    createFile,
    deleteItem,
    toggleFileSelection,
    clearSelection,
  };
}

export default useFileBrowser;
