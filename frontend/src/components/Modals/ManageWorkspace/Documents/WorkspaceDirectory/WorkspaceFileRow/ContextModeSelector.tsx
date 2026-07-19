// SPDX-License-Identifier: MIT
import { memo, useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { PushPin } from "@phosphor-icons/react/dist/csr/PushPin";
import { CaretDown } from "@phosphor-icons/react/dist/csr/CaretDown";
import Workspace from "@/models/workspace";
import showToast from "@/utils/toast";
import logger from "@/utils/logger";

const MODES = [
  {
    value: "off",
    labelKey: "contextMode.standard",
    descriptionKey: "contextMode.search",
  },
  {
    value: "summary",
    labelKey: "contextMode.summary",
    descriptionKey: "contextMode.summaryAlways",
  },
  {
    value: "full",
    labelKey: "contextMode.fullText",
    descriptionKey: "contextMode.entireDoc",
  },
] as const;

type ContextMode = (typeof MODES)[number]["value"];

/**
 * Resolve the effective context mode for a workspace document from the
 * multiple places the backend may expose it:
 * 1. item.contextModes[workspaceId] (file picker enrichment)
 * 2. item.contextMode (if present)
 * 3. workspace.documents[].contextMode (workspace API)
 * 4. legacy pin → "full"
 */
function resolveContextMode(
  workspace: any,
  docId: string,
  item: any,
): ContextMode {
  const wsId = workspace?.id;
  const fromMap =
    item?.contextModes?.[wsId] ?? item?.contextModes?.[String(wsId)];
  if (fromMap === "off" || fromMap === "summary" || fromMap === "full") {
    return fromMap;
  }
  if (
    item?.contextMode === "off" ||
    item?.contextMode === "summary" ||
    item?.contextMode === "full"
  ) {
    return item.contextMode;
  }
  const fromWorkspace = workspace?.documents?.find(
    (d: any) =>
      d.docId === docId ||
      d.docId === item?.id ||
      (item?.name && d.docpath?.endsWith(`/${item.name}`)) ||
      d.docpath === item?.name,
  );
  if (
    fromWorkspace?.contextMode === "summary" ||
    fromWorkspace?.contextMode === "full" ||
    fromWorkspace?.contextMode === "off"
  ) {
    return fromWorkspace.contextMode;
  }
  if (item?.pinnedWorkspaces?.includes(wsId)) return "full";
  if (fromWorkspace?.pinned) return "full";
  return "off";
}

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
  const [mode, setMode] = useState<ContextMode>(() =>
    resolveContextMode(workspace, docId, item),
  );
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  const getLabel = (m: (typeof MODES)[number]) => t(m.labelKey);
  const getDescription = (m: (typeof MODES)[number]) => t(m.descriptionKey);

  // Re-sync after document list / workspace refresh so the UI matches backend.
  useEffect(() => {
    setMode(resolveContextMode(workspace, docId, item));
  }, [workspace, docId, item, item?.contextMode, item?.contextModes, item?.pinnedWorkspaces]);

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
    const previous = mode;
    // Optimistic UI so the mode does not appear to "snap back" while saving.
    setMode(newMode);
    try {
      const success = await Workspace.setContextModeForDocument(
        workspace.slug,
        docId,
        newMode,
      );
      if (!success) {
        setMode(previous);
        showToast(t("contextMode.setFailed"), "error", { clear: true });
        return;
      }
      const activeMode = MODES.find((m) => m.value === newMode);
      showToast(
        `${t("contextMode.label")}: ${activeMode ? getLabel(activeMode) : ""}`,
        "success",
        { clear: true },
      );
    } catch (error: any) {
      setMode(previous);
      logger.error(error);
      showToast(
        t("contextMode.setError", { message: error?.message || String(error) }),
        "error",
        { clear: true },
      );
    }
  };

  if (!item) return <div className="w-[16px] p-[2px] ml-2" />;
  const active = mode !== "off";
  const activeMode = MODES.find((m) => m.value === mode);
  const activeLabel = activeMode ? getLabel(activeMode) : "";

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
        data-tooltip-content={`${t("contextMode.label")}: ${activeLabel}`}
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
                {getLabel(m)}
              </p>
              <p className="text-[10px] text-theme-text-secondary leading-relaxed">
                {getDescription(m)}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

export default ContextModeSelector;
