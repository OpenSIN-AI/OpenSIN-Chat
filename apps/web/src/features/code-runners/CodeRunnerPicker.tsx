// SPDX-License-Identifier: MIT

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { CaretDown } from "@phosphor-icons/react/dist/csr/CaretDown";
import { Check } from "@phosphor-icons/react/dist/csr/Check";
import { Code } from "@phosphor-icons/react/dist/csr/Code";
import { CODE_RUNNER_CATALOG } from "./catalog";

interface CodeRunnerPickerProps {
  value?: string | null;
  onChange: (runnerId: string) => void;
}

interface MenuPosition {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
}

const VIEWPORT_GAP = 12;
const TRIGGER_GAP = 8;
const MENU_WIDTH = 288;
const MENU_MAX_HEIGHT = 384;
const MENU_MIN_HEIGHT = 152;

export default function CodeRunnerPicker({
  value,
  onChange,
}: CodeRunnerPickerProps) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const listboxId = useId();
  const selected = useMemo(
    () => CODE_RUNNER_CATALOG.find((runner) => runner.id === value) || null,
    [value],
  );

  useLayoutEffect(() => {
    if (!open) {
      setMenuPosition(null);
      return undefined;
    }

    function reposition() {
      const trigger = triggerRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const width = Math.min(MENU_WIDTH, window.innerWidth - VIEWPORT_GAP * 2);
      const left = Math.min(
        Math.max(VIEWPORT_GAP, rect.left),
        Math.max(VIEWPORT_GAP, window.innerWidth - width - VIEWPORT_GAP),
      );
      const spaceAbove = Math.max(0, rect.top - TRIGGER_GAP - VIEWPORT_GAP);
      const spaceBelow = Math.max(
        0,
        window.innerHeight - rect.bottom - TRIGGER_GAP - VIEWPORT_GAP,
      );
      const openAbove =
        spaceAbove >= MENU_MIN_HEIGHT &&
        (spaceAbove >= MENU_MAX_HEIGHT || spaceAbove > spaceBelow);
      const maxHeight = Math.max(
        96,
        Math.min(MENU_MAX_HEIGHT, openAbove ? spaceAbove : spaceBelow),
      );
      const top = openAbove
        ? Math.max(VIEWPORT_GAP, rect.top - TRIGGER_GAP - maxHeight)
        : Math.min(
            rect.bottom + TRIGGER_GAP,
            window.innerHeight - VIEWPORT_GAP - maxHeight,
          );

      setMenuPosition({ top, left, width, maxHeight });
    }

    reposition();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false);
      }
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

  const menu =
    open && menuPosition
      ? createPortal(
          <div
            ref={menuRef}
            id={listboxId}
            role="listbox"
            aria-label="Coding-Agent auswählen"
            style={{
              position: "fixed",
              top: menuPosition.top,
              left: menuPosition.left,
              width: menuPosition.width,
              maxHeight: menuPosition.maxHeight,
            }}
            className="z-[250] overflow-y-auto rounded-xl border border-theme-border bg-theme-bg-secondary p-1.5 shadow-[0_18px_56px_rgba(0,0,0,0.28),0_3px_12px_rgba(0,0,0,0.12)]"
          >
            {CODE_RUNNER_CATALOG.map((runner) => {
              const active = runner.id === value;
              return (
                <button
                  key={runner.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(runner.id);
                    setOpen(false);
                    triggerRef.current?.focus();
                  }}
                  className={`flex w-full items-start gap-2 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-theme-bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-focus ${
                    active ? "bg-theme-bg-tertiary" : ""
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-theme-text-primary">
                      {runner.name}
                    </span>
                    <span className="mt-0.5 block text-xs leading-4 text-theme-text-secondary">
                      {runner.description}
                    </span>
                  </div>
                  {active && (
                    <Check
                      size={14}
                      weight="bold"
                      className="mt-1 shrink-0 text-theme-text-primary"
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        onClick={() => setOpen((current) => !current)}
        className="flex h-8 max-w-full items-center gap-1.5 rounded-lg border-none px-2 text-xs font-medium text-theme-text-secondary hover:bg-theme-bg-tertiary hover:text-theme-text-primary"
      >
        <Code size={14} className="shrink-0" aria-hidden="true" />
        <span className="truncate">{selected?.name || "Coding-Agent"}</span>
        <CaretDown
          size={11}
          className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {menu}
    </>
  );
}
