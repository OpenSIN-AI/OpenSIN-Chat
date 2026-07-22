// SPDX-License-Identifier: MIT

import { useMemo, useState } from "react";
import { CaretDown } from "@phosphor-icons/react/dist/csr/CaretDown";
import { Code } from "@phosphor-icons/react/dist/csr/Code";
import { Plus } from "@phosphor-icons/react/dist/csr/Plus";
import { CODE_RUNNER_CATALOG } from "./catalog";

interface CodeRunnerPickerProps {
  value?: string | null;
  onChange: (runnerId: string) => void;
}

export default function CodeRunnerPicker({ value, onChange }: CodeRunnerPickerProps) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => CODE_RUNNER_CATALOG.find((runner) => runner.id === value) || null, [value]);

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex h-8 items-center gap-1.5 rounded-lg border-none px-2 text-xs font-medium text-theme-text-secondary hover:bg-theme-bg-tertiary hover:text-theme-text-primary"
      >
        <Code size={14} />
        <span>{selected?.name || "Coding-Agent"}</span>
        <CaretDown size={11} />
      </button>

      {open && (
        <div role="listbox" className="absolute bottom-10 left-0 z-50 w-72 overflow-hidden rounded-xl border border-theme-border bg-theme-bg-secondary p-1 shadow-xl">
          {CODE_RUNNER_CATALOG.map((runner) => (
            <button
              key={runner.id}
              type="button"
              role="option"
              aria-selected={runner.id === value}
              onClick={() => {
                onChange(runner.id);
                setOpen(false);
              }}
              className="flex w-full flex-col rounded-lg px-3 py-2 text-left hover:bg-theme-bg-tertiary"
            >
              <span className="text-sm font-medium text-theme-text-primary">{runner.name}</span>
              <span className="mt-0.5 text-xs text-theme-text-secondary">{runner.description}</span>
            </button>
          ))}
          <button
            type="button"
            className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-theme-text-secondary hover:bg-theme-bg-tertiary hover:text-theme-text-primary"
          >
            <Plus size={13} />
            Eigenen Runner verbinden
          </button>
        </div>
      )}
    </div>
  );
}
