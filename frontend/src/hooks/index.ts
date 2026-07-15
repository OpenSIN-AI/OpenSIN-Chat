// SPDX-License-Identifier: MIT
/**
 * Custom React hooks with TypeScript for data fetching and state management.
 * Demonstrates proper typing patterns for React and SWR integration.
 */

import { useCallback, useState } from "react";
import type { Workspace as WorkspaceType } from "@/types/workspace";
import Workspace from "@/models/workspace";
import System from "@/models/system";
import useChatHistorySWR, {
  chatHistoryKey,
  invalidateChatHistory,
} from "./useChatHistory";
import useWorkspaceBySlug, { workspaceKey } from "./useWorkspaceBySlug";
import useWorkspacesSWR, { WORKSPACES_KEY } from "./useWorkspaces";
import useThreadsSWR, { threadsKey } from "./useThreads";
import useSWR from "swr";

export { workspaceKey, WORKSPACES_KEY, threadsKey };

/**
 * Hook for fetching workspace data.
 * Backed by SWR so the same slug is cached and de-duplicated across components.
 * The public return shape is preserved for existing consumers.
 *
 * @param slug - Workspace slug identifier
 * @returns Workspace data or null, plus loading and error states
 */
export function useWorkspace(slug: string | null): {
  workspace: WorkspaceType | null;
  loading: boolean;
  error: Error | null;
} {
  const { workspace, isLoading: loading, error } = useWorkspaceBySlug(slug);
  return { workspace, loading, error: error || null };
}

/**
 * Hook for fetching all workspaces.
 * Backed by SWR for caching and de-duplication.
 * The public return shape is preserved for existing consumers.
 */
export function useWorkspaces(): {
  workspaces: WorkspaceType[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
} {
  const { workspaces, isLoading: loading, error, refresh } = useWorkspacesSWR();
  return {
    workspaces,
    loading,
    error: error || null,
    refetch: useCallback(async () => {
      await refresh();
    }, [refresh]),
  };
}

/**
 * Hook for fetching threads in a workspace.
 * Backed by SWR for caching and de-duplication.
 * The public return shape is preserved for existing consumers.
 */
export function useThreads(workspaceSlug: string | null): {
  threads: import("@/types/workspace").Thread[];
  loading: boolean;
  error: Error | null;
} {
  const { threads, isLoading: loading, error } = useThreadsSWR(workspaceSlug);
  return { threads, loading, error: error || null };
}

/**
 * Hook for fetching chat history.
 * Replaced with SWR-backed implementation for caching and de-duplication.
 * Supports both workspace and thread chat history.
 */
export function useChatHistory(
  workspaceSlug: string | null,
  threadSlug: string | null,
): {
  messages: import("@/types/workspace").Message[];
  loading: boolean;
  error: Error | null;
} {
  const { history, isLoading, error } = useChatHistorySWR(
    workspaceSlug,
    threadSlug,
  );
  return { messages: history as any, loading: isLoading, error: error || null };
}

export { chatHistoryKey, invalidateChatHistory };

const SYSTEM_CONFIG_KEY = "system/config";

/**
 * Hook for system configuration.
 * Backed by SWR so the ping/onboarding check is cached and de-duplicated.
 * The public return shape is preserved for existing consumers.
 */
export function useSystemConfig(): {
  isOnboarded: boolean;
  isHealthy: boolean;
  loading: boolean;
} {
  const { data, isLoading: loading } = useSWR(SYSTEM_CONFIG_KEY, async () => {
    const [healthy, onboarded] = await Promise.all([
      System.ping(),
      System.isOnboardingComplete(),
    ]);
    return { healthy, onboarded };
  });

  return {
    isOnboarded: (data as any)?.onboarded ?? false,
    isHealthy: (data as any)?.healthy ?? false,
    loading,
  };
}

/**
 * Hook for sending messages
 */
export function useSendMessage(): {
  send: (
    workspaceSlug: string,
    threadSlug: string,
    message: string,
  ) => Promise<string>;
  loading: boolean;
  error: Error | null;
} {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const send = useCallback(
    async (
      workspaceSlug: string,
      threadSlug: string,
      message: string,
    ): Promise<string> => {
      try {
        setLoading(true);
        setError(null);
        const response = await Workspace.sendMessage(
          workspaceSlug,
          threadSlug,
          message,
        );
        return response;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { send, loading, error };
}
