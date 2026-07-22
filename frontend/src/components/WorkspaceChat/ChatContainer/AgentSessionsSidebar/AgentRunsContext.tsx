// SPDX-License-Identifier: MIT
// Purpose: React context that consumes the agent-runs SSE stream, holds runs
//          as a flat map, and exposes a Traycer-style lineage tree (buildTree).
// Docs: AgentRunsContext.doc.md
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";

export type RunStatus =
  "queued" | "running" | "waiting_input" | "done" | "error" | "cancelled";

export interface ToolCall {
  id: string;
  name: string;
  args?: Record<string, any>;
  output?: string;
  status: "running" | "done" | "error";
  startedAt: number;
  endedAt?: number;
}

export interface AgentRun {
  runId: string;
  parentRunId: string | null;
  agentName: string;
  model?: string;
  status: RunStatus;
  toolCalls: ToolCall[];
  logLines: string[];
  startedAt: number;
  endedAt?: number;
  children?: AgentRun[];
}

interface AgentRunsCtx {
  runs: Record<string, AgentRun>;
  runTree: AgentRun[];
  activeRunCount: number;
  cancelRun: (runId: string) => Promise<void>;
  respondToInput: (runId: string, payload: any) => void;
}

const Ctx = createContext<AgentRunsCtx | undefined>(undefined);

// --- Helpers ---

function emptyRun(runId: string): AgentRun {
  return {
    runId,
    parentRunId: null,
    agentName: "Agent",
    status: "queued",
    toolCalls: [],
    logLines: [],
    startedAt: Date.now(),
  };
}

/**
 * Build a Traycer-style lineage tree from a flat run map.
 * Top-level runs (parentRunId === null) are roots.
 * Children are nested under their parent.
 */
function buildTree(runs: Record<string, AgentRun>): AgentRun[] {
  const withChildren = Object.values(runs).map((r) => ({
    ...r,
    children: [] as AgentRun[],
  }));
  const byId = Object.fromEntries(withChildren.map((r) => [r.runId, r]));
  const roots: AgentRun[] = [];
  for (const r of withChildren) {
    if (r.parentRunId && byId[r.parentRunId]) {
      byId[r.parentRunId].children!.push(r);
    } else {
      roots.push(r);
    }
  }
  return roots.sort((a, b) => b.startedAt - a.startedAt);
}

// --- Provider ---

export function AgentRunsProvider({
  workspaceSlug,
  authToken,
  apiBase,
  children,
}: {
  workspaceSlug: string;
  authToken: string;
  apiBase: string;
  children: React.ReactNode;
}) {
  const [runs, setRuns] = useState<Record<string, AgentRun>>({});
  const esRef = useRef<EventSource | null>(null);

  const upsertRun = useCallback((runId: string, patch: Partial<AgentRun>) => {
    setRuns((prev) => ({
      ...prev,
      [runId]: { ...(prev[runId] ?? emptyRun(runId)), ...patch },
    }));
  }, []);

  useEffect(() => {
    const url = `${apiBase}/workspace/${workspaceSlug}/agent-runs/stream?token=${encodeURIComponent(authToken)}`;
    const es = new EventSource(url);
    esRef.current = es;

    const safeParse = (raw: string) => {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    };

    es.addEventListener("run.started", (e) => {
      const d = safeParse((e as MessageEvent).data);
      if (!d) return;
      upsertRun(d.runId, {
        parentRunId: d.parentRunId ?? null,
        agentName: d.agentName,
        model: d.model,
        status: d.status || "running",
        startedAt: d.ts || Date.now(),
        toolCalls: [],
        logLines: [],
      });
    });

    es.addEventListener("run.tool", (e) => {
      const d = safeParse((e as MessageEvent).data);
      if (!d) return;
      setRuns((prev) => {
        const run = prev[d.runId];
        if (!run) return prev;
        const idx = run.toolCalls.findIndex((t) => t.id === d.toolId);
        const tc: ToolCall =
          idx >= 0
            ? { ...run.toolCalls[idx] }
            : {
                id: d.toolId,
                name: d.name,
                status: "running",
                startedAt: d.ts || Date.now(),
              };
        if (d.phase === "args") tc.args = d.args;
        if (d.phase === "result") {
          tc.output = d.output;
          tc.status = "done";
          tc.endedAt = d.ts;
        }
        if (d.phase === "error") {
          tc.output = d.error;
          tc.status = "error";
          tc.endedAt = d.ts;
        }
        const toolCalls =
          idx >= 0
            ? run.toolCalls.map((t, i) => (i === idx ? tc : t))
            : [...run.toolCalls, tc];
        return { ...prev, [d.runId]: { ...run, toolCalls } };
      });
    });

    es.addEventListener("run.log", (e) => {
      const d = safeParse((e as MessageEvent).data);
      if (!d) return;
      setRuns((prev) => {
        const run = prev[d.runId];
        if (!run) return prev;
        return {
          ...prev,
          [d.runId]: {
            ...run,
            logLines: [...run.logLines.slice(-199), d.line],
          },
        };
      });
    });

    es.addEventListener("run.waiting_input", (e) => {
      const d = safeParse((e as MessageEvent).data);
      if (!d) return;
      upsertRun(d.runId, { status: "waiting_input" });
    });

    es.addEventListener("run.finished", (e) => {
      const d = safeParse((e as MessageEvent).data);
      if (!d) return;
      upsertRun(d.runId, { status: d.status, endedAt: d.ts });
    });

    es.onerror = () => {
      // EventSource reconnects automatically — just log for diagnostics
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [workspaceSlug, authToken, apiBase, upsertRun]);

  const runTree = buildTree(runs);
  const activeRunCount = Object.values(runs).filter(
    (r) =>
      r.status === "running" ||
      r.status === "waiting_input" ||
      r.status === "queued",
  ).length;

  const cancelRun = useCallback(
    async (runId: string) => {
      try {
        await fetch(
          `${apiBase}/workspace/${workspaceSlug}/agent-runs/${runId}/cancel`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${authToken}` },
          },
        );
      } catch (e: any) {
        console.warn("[AgentRunsContext] non-fatal error:", e?.message || e);
      }
    },
    [apiBase, workspaceSlug, authToken],
  );

  const respondToInput = useCallback(
    (runId: string, payload: any) => {
      try {
        fetch(
          `${apiBase}/workspace/${workspaceSlug}/agent-runs/${runId}/respond`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${authToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          },
        );
      } catch (e: any) {
        console.warn("[AgentRunsContext] non-fatal error:", e?.message || e);
      }
    },
    [apiBase, workspaceSlug, authToken],
  );

  return (
    <Ctx.Provider
      value={{ runs, runTree, activeRunCount, cancelRun, respondToInput }}
    >
      {children}
    </Ctx.Provider>
  );
}

// Safe fallback used when the hook is consumed outside of an
// AgentRunsProvider (e.g. the Home screen renders the chat chrome without an
// active workspace agent stream). Returning inert defaults keeps shared UI
// like the RightSidebarIconBar functional instead of crashing the tree.
const EMPTY_AGENT_RUNS: AgentRunsCtx = {
  runs: {},
  runTree: [],
  activeRunCount: 0,
  cancelRun: async () => {},
  respondToInput: () => {},
};

export function useAgentRuns() {
  const c = useContext(Ctx);
  return c ?? EMPTY_AGENT_RUNS;
}
