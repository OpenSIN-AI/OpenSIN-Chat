// SPDX-License-Identifier: MIT
import { memo, useState, useRef, useEffect } from "react";
import { PushPin } from "@phosphor-icons/react/dist/csr/PushPin";
import { CaretDown } from "@phosphor-icons/react/dist/csr/CaretDown";
import Workspace from "@/models/workspace";
import showToast from "@/utils/toast";
import logger from "@/utils/logger";

const MODES = [
  {
    value: "off",
    label: "Standard (RAG)",
    description: "Only relevant excerpts via search",
  },
  {
    value: "summary",
    label: "Summary",
    description: "Summary always in context (token-efficient)",
  },
  {
    value: "full",
    label: "Full text (Pin)",
    description: "Entire document always in context",
  },
] as const;

type ContextMode = (typeof MODES)[number]["value"];

/**
 * Replaces the binary Pin-Toggle with a three-level context mode selector.
 * Backend: PATCH /workspace/:slug/documents/:docId/context-mode
 */
const ContextModeSelector = memo(function ContextModeSelector({
  workspace,
  docId,
  item,
}: {
  workspace: any;
  docId: string;
  item: any;
}) {
  const initialMode: ContextMode =
    item?.contextMode ||
    (item?.pinnedWorkspaces?.includes(workspace.id) ? "full" : "off");
  const [mode, setMode] = useState<ContextMode>(initialMode);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const selectMode = async (e: React.MouseEvent, newMode: ContextMode) => {
    e.stopPropagation();
    setOpen(false);
    if (newMode === mode) return;
    try {
      const success = await Workspace.setContextModeForDocument(
        workspace.slug,
        docId,
        newMode,
      );
      if (!success) {
        showToast("Failed to set context mode.", "error", { clear: true });
        return;
      }
      setMode(newMode);
      showToast(
        `Context mode: ${MODES.find((m) => m.value === newMode)?.label}`,
        "success",
        { clear: true },
      );
    } catch (error: any) {
      logger.error(error);
      showToast(`Error: ${error.message}`, "error", { clear: true });
    }
  };

  if (!item) return <div className="w-[16px] p-[2px] ml-2" />;
  const active = mode !== "off";
  const activeLabel = MODES.find((m) => m.value === mode)?.label;

  return (
    <div className="relative ml-2" ref={menuRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="group flex items-center gap-x-1 cursor-pointer"
        data-tooltip-id="pin-document"
        data-tooltip-content={`Context mode: ${activeLabel}`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {active ? (
          <div className="bg-theme-settings-input-active rounded-3xl whitespace-nowrap flex items-center gap-x-0.5 px-2 py-0.5">
            <p className="text-xs">{activeLabel}</p>
            <CaretDown size={10} weight="bold" aria-hidden="true" />
          </div>
        ) : (
          <span className="flex items-center gap-x-0.5">
            <PushPin
              size={16}
              weight="regular"
              className="outline-none text-base font-bold flex-shrink-0"
              aria-hidden="true"
            />
            <CaretDown size={10} weight="bold" aria-hidden="true" />
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-6 z-50 w-64 rounded-lg border border-theme-modal-border bg-theme-bg-secondary shadow-lg p-1"
        >
          {MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              role="menuitemradio"
              aria-checked={mode === m.value}
              onClick={(e) => selectMode(e, m.value)}
              className={`w-full text-left rounded-md px-3 py-2 hover:bg-theme-sidebar-item-hover transition-colors ${
                mode === m.value ? "bg-theme-sidebar-item-selected" : ""
              }`}
            >
              <p className="text-xs font-semibold text-theme-text-primary">
                {m.label}
              </p>
              <p className="text-[10px] text-theme-text-secondary leading-relaxed">
                {m.description}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

export default ContextModeSelector;
