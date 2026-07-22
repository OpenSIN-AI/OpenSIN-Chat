// SPDX-License-Identifier: MIT

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CaretDown } from "@phosphor-icons/react/dist/csr/CaretDown";
import { Code } from "@phosphor-icons/react/dist/csr/Code";
import { CODE_RUNNER_CATALOG } from "./catalog";

interface CodeRunnerPickerProps {
  value?: string | null;
  onChange: (runnerId: string) => void;
}

export default function CodeRunnerPicker({
  value,
  onChange,
}: CodeRunnerPickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listboxId = useId();
  const selected = useMemo(
    () => CODE_RUNNER_CATALOG.find((runner) => runner.id === value) || null,
    [value],
  );

  useEffect(() => {
    if (!open) return undefined;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        onClick={() => setOpen((current) => !current)}
        className="flex h-8 items-center gap-1.5 rounded-lg border-none px-2 text-xs font-medium text-theme-text-secondary hover:bg-theme-bg-tertiary hover:text-theme-text-primary"
      >
        <Code size={14} aria-hidden="true" />
        <span>{selected?.name || "Coding-Agent"}</span>
        <CaretDown size={11} aria-hidden="true" />
      </button>

      {open && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Coding-Agent auswählen"
          className="absolute bottom-10 left-0 z-50 w-72 overflow-hidden rounded-xl border border-theme-border bg-theme-bg-secondary p-1 shadow-xl"
        >
          {CODE_RUNNER_CATALOG.map((runner) => (
            <button
              key={runner.id}
              type="button"
              role="option"
              aria-selected={runner.id === value}
              onClick={() => {
                onChange(runner.id);
                setOpen(false);
                triggerRef.current?.focus();
              }}
              className="flex w-full flex-col rounded-lg px-3 py-2 text-left hover:bg-theme-bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-focus"
            >
              <span className="text-sm font-medium text-theme-text-primary">
                {runner.name}
              </span>
              <span className="mt-0.5 text-xs text-theme-text-secondary">
                {runner.description}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
