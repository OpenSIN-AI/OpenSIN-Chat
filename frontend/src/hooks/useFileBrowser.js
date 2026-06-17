// SPDX-License-Identifier: MIT
import { useState, useCallback } from "react";
import { API_BASE } from "@/utils/constants";

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
        `${API_BASE}/utils/browse-directory?path=${encodeURIComponent(targetPath)}`,
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

  const navigateTo = useCallback(
    (targetPath) => browse(targetPath),
    [browse],
  );

  const navigateUp = useCallback(() => {
    if (parentPath) browse(parentPath);
  }, [parentPath, browse]);

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
    toggleFileSelection,
    clearSelection,
  };
}

export default useFileBrowser;
