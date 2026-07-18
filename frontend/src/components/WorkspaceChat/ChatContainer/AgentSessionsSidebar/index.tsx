// SPDX-License-Identifier: MIT
// Purpose: Right-sidebar panel showing live agent runs as a lineage tree
//          with tool calls, status icons, and cancel buttons.
//          Modeled after Traycer's agent-to-agent tree visualization.
// Docs: AgentSessionsSidebar.doc.md
import { useAgentRuns, AgentRun } from "./AgentRunsContext";
import { useTranslation } from "react-i18next";
import { CircleNotch } from "@phosphor-icons/react/dist/csr/CircleNotch";
import { CheckCircle } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { XCircle } from "@phosphor-icons/react/dist/csr/XCircle";
import { Stop } from "@phosphor-icons/react/dist/csr/Stop";

const statusIcon: Record<string, React.ReactNode> = {
  running: <CircleNotch className="animate-spin text-[#009ee0]" size={14} />,
  waiting_input: <span className="text-amber-400 text-xs">⏸</span>,
  done: <CheckCircle className="text-green-500" size={14} />,
  error: <XCircle className="text-red-500" size={14} />,
  queued: <span className="text-zinc-400 text-xs">…</span>,
  cancelled: <span className="text-zinc-500 text-xs">⊘</span>,
};

function RunNode({
  run,
  depth,
}: {
  run: AgentRun & { children?: AgentRun[] };
  depth: number;
}) {
  const { cancelRun } = useAgentRuns();
  const { t } = useTranslation();
  const isActive = run.status === "running" || run.status === "waiting_input";

  return (
    <div
      className="flex flex-col pl-[calc(var(--tree-depth,0)*12px)]"
      style={{ "--tree-depth": depth } as React.CSSProperties}
    >
      <div className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-lg hover:bg-theme-sidebar-item-hover group">
        <div className="flex items-center gap-2 min-w-0">
          {statusIcon[run.status]}
          <span className="text-sm text-theme-text-primary truncate">
            {run.agentName}
          </span>
          {run.model && (
            <span className="text-[10px] text-theme-text-secondary">
              {run.model}
            </span>
          )}
        </div>
        {isActive && (
          <button
            onClick={() => cancelRun(run.runId)}
            className="opacity-0 group-hover:opacity-100 text-theme-text-secondary hover:text-red-400 transition-opacity"
            aria-label={t("right_sidebar.cancelRun", "Cancel run")}
          >
            <Stop size={14} weight="fill" />
          </button>
        )}
      </div>

      {/* Live Tool-Calls */}
      {run.toolCalls.length > 0 && (
        <div className="ml-6 flex flex-col gap-0.5 border-l border-zinc-800 light:border-slate-200 pl-2 py-1">
          {run.toolCalls.map((tc) => (
            <div key={tc.id} className="flex items-center gap-1.5 text-xs">
              {tc.status === "running" && (
                <CircleNotch
                  className="animate-spin text-theme-text-secondary"
                  size={11}
                />
              )}
              {tc.status === "done" && (
                <CheckCircle className="text-green-500" size={11} />
              )}
              {tc.status === "error" && (
                <XCircle className="text-red-500" size={11} />
              )}
              <span className="text-theme-text-secondary font-mono truncate">
                {tc.name}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Child runs (A2A lineage) */}
      {run.children?.map((c) => (
        <RunNode key={c.runId} run={c as any} depth={depth + 1} />
      ))}
    </div>
  );
}

export default function AgentSessionsSidebar({
  workspace,
}: {
  workspace: any;
}) {
  const { t } = useTranslation();
  const { runTree } = useAgentRuns();

  return (
    <div className="h-full w-full max-w-full flex flex-col p-3 overflow-y-auto">
      <h3 className="text-sm font-bold text-theme-text-primary mb-2">
        {t("right_sidebar.agent_sessions_title", "Agent-Sessions")}
      </h3>
      {runTree.length === 0 ? (
        <p className="text-xs text-theme-text-secondary mt-4 text-center">
          {t("right_sidebar.no_active_runs", "Keine aktiven Agent-Läufe.")}
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          {runTree.map((r) => (
            <RunNode key={r.runId} run={r as any} depth={0} />
          ))}
        </div>
      )}
    </div>
  );
}
