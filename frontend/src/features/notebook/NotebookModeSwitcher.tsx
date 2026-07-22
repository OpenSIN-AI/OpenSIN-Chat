// SPDX-License-Identifier: MIT

import { ChatCircle } from "@phosphor-icons/react/dist/csr/ChatCircle";
import { Code } from "@phosphor-icons/react/dist/csr/Code";
import { Lightning } from "@phosphor-icons/react/dist/csr/Lightning";
import { NOTEBOOK_MODES, type NotebookModeId } from "./modes";

interface NotebookModeSwitcherProps {
  value: NotebookModeId;
  onChange: (mode: NotebookModeId) => void;
  compact?: boolean;
}

const MODE_ICONS = {
  chat: ChatCircle,
  work: Lightning,
  code: Code,
} as const;

export default function NotebookModeSwitcher({ value, onChange, compact = false }: NotebookModeSwitcherProps) {
  return (
    <div role="radiogroup" aria-label="Arbeitsmodus" className="inline-flex items-center rounded-xl bg-theme-bg-secondary p-1">
      {Object.values(NOTEBOOK_MODES).map((mode) => {
        const active = value === mode.id;
        const Icon = MODE_ICONS[mode.id];
        return (
          <button
            key={mode.id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`${mode.label}: ${mode.description}`}
            title={mode.description}
            onClick={() => onChange(mode.id)}
            className={`flex h-8 items-center justify-center gap-1.5 rounded-lg border-none px-2.5 text-xs font-medium transition-colors ${
              active
                ? "bg-theme-bg-primary text-theme-text-primary shadow-sm"
                : "bg-transparent text-theme-text-secondary hover:text-theme-text-primary"
            }`}
          >
            <Icon size={14} weight={active ? "fill" : "regular"} />
            {!compact && <span>{mode.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
