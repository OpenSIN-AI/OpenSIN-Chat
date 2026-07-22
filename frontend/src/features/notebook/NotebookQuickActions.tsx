// SPDX-License-Identifier: MIT

import { ArrowUpRight } from "@phosphor-icons/react/dist/csr/ArrowUpRight";
import { NOTEBOOK_QUICK_ACTIONS } from "./quick-actions";
import type { NotebookModeId } from "./modes";

interface NotebookQuickActionsProps {
  mode: NotebookModeId;
  onSelect: (prompt: string) => void;
}

export default function NotebookQuickActions({ mode, onSelect }: NotebookQuickActionsProps) {
  const actions = NOTEBOOK_QUICK_ACTIONS[mode];
  return (
    <section className="w-full">
      <h2 className="mb-2 px-1 text-[11px] font-medium text-theme-text-secondary">Vorschläge</h2>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={() => onSelect(action.prompt)}
            className="group flex min-h-11 items-center gap-3 rounded-xl border border-theme-border px-3 py-2 text-left transition-colors hover:bg-theme-bg-secondary"
          >
            <span className="min-w-0 flex-1 truncate text-xs font-medium text-theme-text-primary">{action.title}</span>
            <ArrowUpRight size={13} className="shrink-0 text-theme-text-secondary opacity-0 transition-opacity group-hover:opacity-100" />
          </button>
        ))}
      </div>
    </section>
  );
}
