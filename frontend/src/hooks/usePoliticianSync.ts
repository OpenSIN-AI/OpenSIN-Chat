// SPDX-License-Identifier: MIT
// Purpose: SWR hook for politician sync status and stats
// Docs: usePoliticianSync.doc.md
import useSWR from "swr";
import { API_BASE } from "@/utils/constants";

interface PoliticianStats {
  politicians: number;
  speeches: number;
  votes: number;
}

interface SyncSource {
  source: string;
  status: string;
  lastAttempt: string;
  lastSuccess: string | null;
  itemsProcessed: number;
  itemsFailed: number;
  error: string | null;
  isHealthy: boolean;
}

interface RetryQueueItem {
  phase: string;
  attempts: number;
  status: string;
  nextRetryAt: string | null;
  lastError: string | null;
}

interface SyncStatus {
  lastSync: string | null;
  isHealthy: boolean;
  sources: SyncSource[];
  retryQueue: RetryQueueItem[];
}

interface UsePoliticianSyncResult {
  stats: PoliticianStats | null;
  syncStatus: SyncStatus | null;
  isLoading: boolean;
  error: Error | null;
  mutate: () => void;
}

async function fetcher(url: string): Promise<any> {
  const res = await fetch(`${API_BASE}${url}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export default function usePoliticianSync(): UsePoliticianSyncResult {
  const {
    data: statsData,
    error: statsError,
    isLoading: statsLoading,
    mutate: mutateStats,
  } = useSWR("/api/politician/stats", fetcher, {
    refreshInterval: 30000,
    revalidateOnFocus: true,
  });

  const {
    data: syncData,
    error: syncError,
    isLoading: syncLoading,
    mutate: mutateSync,
  } = useSWR("/api/politician/sync/status", fetcher, {
    refreshInterval: 30000,
    revalidateOnFocus: true,
  });

  const isLoading = statsLoading || syncLoading;
  const error = statsError || syncError || null;

  const mutate = () => {
    mutateStats();
    mutateSync();
  };

  return {
    stats: statsData || null,
    syncStatus: syncData || null,
    isLoading,
    error,
    mutate,
  };
}
