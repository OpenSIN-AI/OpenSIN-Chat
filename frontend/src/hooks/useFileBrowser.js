// SPDX-License-Identifier: MIT
import { useState, useCallback } from "react";
import { API_BASE } from "@/utils/constants";
import { baseHeaders } from "@/utils/request";

export function useFileBrowser() {
  const [currentPath, setCurrentPath] = useState(null);
  const [items, setItems] = useState([]);
  const [parentPath, setParentPath] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);

  const browse = useCallback(async (targetPath) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE}/utils/browse-directory?path=${encodeURIComponent(targetPath || "")}`,
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
  }, []);

  const navigateTo = useCallback((targetPath) => browse(targetPath), [browse]);

  const navigateUp = useCallback(() => {
    if (parentPath) browse(parentPath);
  }, [parentPath, browse]);

  const createDirectory = useCallback(async (name, dirParentPath) => {
    const res = await fetch(`${API_BASE}/utils/create-directory`, {
      method: "POST",
      headers: { ...baseHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ name, parentPath: dirParentPath || "" }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    return res.json();
  }, []);

  const createFile = useCallback(async (name, dirParentPath, content = "") => {
    const res = await fetch(`${API_BASE}/utils/create-file`, {
      method: "POST",
      headers: { ...baseHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ name, parentPath: dirParentPath || "", content }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    return res.json();
  }, []);

  const deleteItem = useCallback(async (itemPath) => {
    const res = await fetch(`${API_BASE}/utils/delete-item`, {
      method: "DELETE",
      headers: { ...baseHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ path: itemPath }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    return res.json();
  }, []);

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
