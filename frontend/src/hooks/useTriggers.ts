// SPDX-License-Identifier: MIT
// Purpose: Frontend hook for agent triggers — CRUD, toggle, fire, runs.
import { useCallback, useEffect, useState } from "react";
import { mutate } from "swr";

const API_BASE = "/api";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("opensin_chat_auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface AgentTrigger {
  id: string;
  workspace_id: number;
  agent_name: string;
  name: string;
  type: "schedule" | "polling";
  config: {
    cron_expression?: string;
    prompt?: string;
    poll_interval_ms?: number;
    connector?: string;
    product?: string;
  };
  active: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  checkpoint: any;
  created_at: string;
  updated_at: string;
}

export interface TriggerRun {
  id: string;
  trigger_id: string;
  status: string;
  attempt: number;
  error_message: string | null;
  result: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

export function useTriggers(workspaceSlug: string) {
  const [triggers, setTriggers] = useState<AgentTrigger[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/workspace/${workspaceSlug}/triggers`, {
        headers: authHeaders(),
      });
      const j = await r.json();
      if (j.success) setTriggers(j.triggers);
    } catch {
      // silently fail
    }
    setLoading(false);
  }, [workspaceSlug]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(
    async (data: Partial<AgentTrigger>): Promise<boolean> => {
      const r = await fetch(`${API_BASE}/workspace/${workspaceSlug}/triggers`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const j = await r.json();
      if (j.success) refresh();
      return j.success;
    },
    [workspaceSlug, refresh],
  );

  const update = useCallback(
    async (triggerId: string, patch: Partial<AgentTrigger>): Promise<boolean> => {
      const r = await fetch(
        `${API_BASE}/workspace/${workspaceSlug}/triggers/${triggerId}`,
        {
          method: "PATCH",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        },
      );
      const j = await r.json();
      if (j.success) refresh();
      return j.success;
    },
    [workspaceSlug, refresh],
  );

  const remove = useCallback(
    async (triggerId: string): Promise<boolean> => {
      const r = await fetch(
        `${API_BASE}/workspace/${workspaceSlug}/triggers/${triggerId}`,
        { method: "DELETE", headers: authHeaders() },
      );
      const j = await r.json();
      if (j.success) refresh();
      return j.success;
    },
    [workspaceSlug, refresh],
  );

  const toggle = useCallback(
    async (triggerId: string, active: boolean): Promise<boolean> => {
      const r = await fetch(
        `${API_BASE}/workspace/${workspaceSlug}/triggers/${triggerId}/toggle`,
        {
          method: "POST",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ active }),
        },
      );
      const j = await r.json();
      if (j.success) refresh();
      return j.success;
    },
    [workspaceSlug, refresh],
  );

  const fire = useCallback(
    async (triggerId: string): Promise<boolean> => {
      const r = await fetch(
        `${API_BASE}/workspace/${workspaceSlug}/triggers/${triggerId}/fire`,
        { method: "POST", headers: authHeaders() },
      );
      const j = await r.json();
      return j.success;
    },
    [workspaceSlug],
  );

  const getRuns = useCallback(
    async (triggerId: string): Promise<TriggerRun[]> => {
      const r = await fetch(
        `${API_BASE}/workspace/${workspaceSlug}/triggers/${triggerId}/runs`,
        { headers: authHeaders() },
      );
      const j = await r.json();
      return j.runs || [];
    },
    [workspaceSlug],
  );

  const replayRun = useCallback(
    async (triggerId: string, runId: string): Promise<boolean> => {
      const r = await fetch(
        `${API_BASE}/workspace/${workspaceSlug}/triggers/${triggerId}/runs/${runId}/replay`,
        { method: "POST", headers: authHeaders() },
      );
      const j = await r.json();
      return j.success;
    },
    [workspaceSlug],
  );

  return { triggers, loading, create, update, remove, toggle, fire, getRuns, replayRun, refresh };
}
