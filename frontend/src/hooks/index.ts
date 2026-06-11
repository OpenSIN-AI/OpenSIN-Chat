// SPDX-License-Identifier: MIT
/**
 * Custom React hooks with TypeScript for data fetching and state management.
 * Demonstrates proper typing patterns for React and SWR integration.
 */

import { useCallback, useState, useEffect } from "react";
import type { Workspace, Thread } from "@/types/workspace";
import Workspace from "@/models/workspace";
import System from "@/models/system";
import useChatHistorySWR, {
  chatHistoryKey,
  invalidateChatHistory,
} from "./useChatHistory";

/**
 * Hook for fetching workspace data
 * @param slug - Workspace slug identifier
 * @returns Workspace data or null, plus loading and error states
 */
export function useWorkspace(slug: string | null): {
  workspace: Workspace | null;
  loading: boolean;
  error: Error | null;
} {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!slug) {
      setWorkspace(null);
      setLoading(false);
      return;
    }

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await Workspace.bySlug(slug);
        setWorkspace(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  return { workspace, loading, error };
}

/**
 * Hook for fetching all workspaces
 */
export function useWorkspaces(): {
  workspaces: Workspace[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
} {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchWorkspaces = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await Workspace.all();
      setWorkspaces(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  return { workspaces, loading, error, refetch: fetchWorkspaces };
}

/**
 * Hook for fetching threads in a workspace
 */
export function useThreads(workspaceSlug: string | null): {
  threads: Thread[];
  loading: boolean;
  error: Error | null;
} {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!workspaceSlug) {
      setThreads([]);
      setLoading(false);
      return;
    }

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await Workspace.threads.all(workspaceSlug);
        setThreads(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    })();
  }, [workspaceSlug]);

  return { threads, loading, error };
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
  return { messages: history, loading: isLoading, error: error || null };
}

export { chatHistoryKey, invalidateChatHistory };

/**
 * Hook for system configuration
 */
export function useSystemConfig(): {
  isOnboarded: boolean;
  isHealthy: boolean;
  loading: boolean;
} {
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [isHealthy, setIsHealthy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const healthy = await System.ping();
        const onboarded = await System.isOnboardingComplete();
        setIsHealthy(healthy);
        setIsOnboarded(onboarded);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { isOnboarded, isHealthy, loading };
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
