// SPDX-License-Identifier: MIT
import { useEffect, useState, useCallback } from "react";
import System from "@/models/system";

/**
 * A generalized hook that fetches system settings on mount.
 * Returns the settings, a loading flag, and a refresh function.
 * Reusable for any component that needs system settings without
 * duplicating System.keys() calls across the codebase.
 *
 * @returns {{ settings: Object, loading: boolean, refresh: () => void }}
 */
export default function useSystemSettings() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const _settings = await System.keys();
    setSettings(_settings);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { settings, loading, refresh };
}
