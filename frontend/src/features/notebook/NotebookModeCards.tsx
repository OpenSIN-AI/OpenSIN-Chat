// SPDX-License-Identifier: MIT

import { ChatCircle } from "@phosphor-icons/react/dist/csr/ChatCircle";
import { Code } from "@phosphor-icons/react/dist/csr/Code";
import { Lightning } from "@phosphor-icons/react/dist/csr/Lightning";
import { NOTEBOOK_MODES, type NotebookModeId } from "./modes";

interface NotebookModeCardsProps {
  value: NotebookModeId;
  onChange: (mode: NotebookModeId) => void;
}

const MODE_ICONS = { chat: ChatCircle, work: Lightning, code: Code } as const;

export default function NotebookModeCards({ value, onChange }: NotebookModeCardsProps) {
  return (
    <div role="radiogroup" aria-label="Arbeitsmodus" className="grid w-full grid-cols-3 gap-2">
      {Object.values(NOTEBOOK_MODES).map((mode) => {
        const active = value === mode.id;
        const Icon = MODE_ICONS[mode.id];
        return (
          <button
            key={mode.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(mode.id)}
            className={`group flex min-w-0 flex-col items-start rounded-xl border p-3 text-left transition-colors ${
              active
                ? "border-theme-text-secondary bg-theme-bg-secondary"
                : "border-theme-border bg-transparent hover:bg-theme-bg-secondary"
            }`}
          >
            <div className="flex w-full items-center gap-2">
              <Icon size={17} weight={active ? "fill" : "regular"} className={active ? "text-theme-text-primary" : "text-theme-text-secondary"} />
              <span className="text-sm font-medium text-theme-text-primary">{mode.label}</span>
              {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-theme-text-primary" />}
            </div>
            <span className="mt-1.5 hidden text-[11px] leading-4 text-theme-text-secondary sm:block">{mode.description}</span>
          </button>
        );
      })}
    </div>
  );
}
