// SPDX-License-Identifier: MIT
// Purpose: Frontend hook for spawning subagents and querying run trees.
//          Used by the Agent Sessions panel for manual subagent spawning.
import { useCallback } from "react";

const API_BASE = "/api";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("opensin_chat_auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface SubagentSpawnParams {
  agentName: string;
  prompt: string;
  model?: string;
}

export function useSubagents(workspaceSlug: string) {
  const spawn = useCallback(
    async (
      parentRunId: string,
      params: SubagentSpawnParams,
    ): Promise<boolean> => {
      try {
        const r = await fetch(
          `${API_BASE}/workspace/${workspaceSlug}/agent-runs/${parentRunId}/spawn`,
          {
            method: "POST",
            headers: { ...authHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify(params),
          },
        );
        const j = await r.json();
        return j.success;
      } catch {
        return false;
      }
    },
    [workspaceSlug],
  );

  const getTree = useCallback(
    async (runId: string): Promise<any> => {
      try {
        const r = await fetch(
          `${API_BASE}/workspace/${workspaceSlug}/agent-runs/${runId}/tree`,
          { headers: authHeaders() },
        );
        const j = await r.json();
        return j.tree;
      } catch {
        return null;
      }
    },
    [workspaceSlug],
  );

  return { spawn, getTree };
}
