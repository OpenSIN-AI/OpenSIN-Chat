// SPDX-License-Identifier: MIT

import { useCallback, useEffect, useState } from "react";
import { listArtifacts } from "./api";
import type { Artifact, ArtifactType } from "./types";

export default function useArtifacts(
  workspaceSlug: string | null | undefined,
  opts?: {
    type?: ArtifactType;
    threadId?: number;
    chatId?: number;
    limit?: number;
  },
) {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const reload = useCallback(async () => {
    if (!workspaceSlug) {
      setArtifacts([]);
      setTotal(0);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await listArtifacts(workspaceSlug, opts);
      setArtifacts(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [workspaceSlug, JSON.stringify(opts)]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { artifacts, loading, error, total, reload };
}
