// SPDX-License-Identifier: MIT
// Purpose: SOTA mobile/tablet access to right-rail tools (bottom FAB + sheet).
// Docs: MobileSidebarMenu.doc.md
//
// Desktop keeps the fixed RightSidebarIconBar. Below `md` that rail is hidden,
// so tools must remain reachable by thumb: a floating action button opens a
// bottom sheet (iOS/Android pattern). While a panel is open, a bottom tool
// dock lets users switch panels without hunting for a buried menu.

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SlidersHorizontal } from "@phosphor-icons/react/dist/csr/SlidersHorizontal";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { Eye } from "@phosphor-icons/react/dist/csr/Eye";
import { Database } from "@phosphor-icons/react/dist/csr/Database";
import { Newspaper } from "@phosphor-icons/react/dist/csr/Newspaper";
import { BookOpen } from "@phosphor-icons/react/dist/csr/BookOpen";
import { FilePdf } from "@phosphor-icons/react/dist/csr/FilePdf";
import { Notepad } from "@phosphor-icons/react/dist/csr/Notepad";
import { Broadcast } from "@phosphor-icons/react/dist/csr/Broadcast";
import { useTranslation } from "react-i18next";
import { useChatSidebar } from "./ChatSidebar";
import { useAgentRuns } from "./AgentSessionsSidebar/AgentRunsContext";

type ToolId =
  | "preview"
  | "database"
  | "political"
  | "sources"
  | "pdf-analysis"
  | "notepad"
  | "agent-sessions";

export default function MobileSidebarMenu() {
  const { t } = useTranslation();
  const { activeSidebar, toggleSidebar, closeSidebar } = useChatSidebar();
  const { activeRunCount } = useAgentRuns();
  const [open, setOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  const items: {
    id: ToolId;
    Icon: typeof Eye;
    label: string;
    badge?: number;
  }[] = [
    {
      id: "preview",
      Icon: Eye,
      label: t("right_sidebar.icon_preview", "Vorschau"),
    },
    {
      id: "database",
      Icon: Database,
      label: t("right_sidebar.icon_database", "Politiker-Datenbank"),
    },
    {
      id: "political",
      Icon: Newspaper,
      label: t("right_sidebar.icon_political", "Politisches"),
    },
    {
      id: "sources",
      Icon: BookOpen,
      label: t("right_sidebar.icon_sources", "Quellen"),
    },
    {
      id: "pdf-analysis",
      Icon: FilePdf,
      label: t("right_sidebar.icon_pdf_analysis", "PDF-Analyse"),
    },
    {
      id: "notepad",
      Icon: Notepad,
      label: t("right_sidebar.icon_notepad", "Notizblock"),
    },
    {
      id: "agent-sessions",
      Icon: Broadcast,
      label: t("right_sidebar.icon_agent_sessions", "Agent-Sessions"),
      badge: activeRunCount,
    },
  ];

  // Close sheet on outside pointer / Escape; lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handlePointer = (event: PointerEvent) => {
      if (!sheetRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    // Delay so the opening click does not immediately close the sheet.
    const timer = window.setTimeout(() => {
      document.addEventListener("pointerdown", handlePointer);
    }, 0);
    document.addEventListener("keydown", handleKey);
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("pointerdown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  // Close the picker sheet once a panel is opened.
  useEffect(() => {
    if (activeSidebar) setOpen(false);
  }, [activeSidebar]);

  function selectTool(id: ToolId) {
    toggleSidebar(id);
    setOpen(false);
  }

  const fabLabel = t("common.rightSidebar", "Werkzeuge");
  const sheetTitle = t("common.toolsSheetTitle", "Werkzeuge & Panels");

  // ── While a panel is fullscreen on mobile: bottom tool dock ───────────
  if (activeSidebar) {
    return createPortal(
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[130] md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="pointer-events-auto mx-auto flex max-w-lg items-center gap-1 border-t border-theme-border bg-theme-bg-sidebar/95 px-2 py-2 shadow-[0_-8px_24px_rgba(0,0,0,0.35)] backdrop-blur-md">
          <div
            className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto white-scrollbar"
            role="toolbar"
            aria-label={fabLabel}
          >
            {items.map(({ id, Icon, label, badge }) => {
              const isActive = activeSidebar === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => selectTool(id)}
                  aria-label={label}
                  aria-pressed={isActive}
                  className={`relative flex h-11 min-w-[44px] shrink-0 flex-col items-center justify-center rounded-lg px-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-text-secondary ${
                    isActive
                      ? "bg-theme-bg-hover text-theme-text-primary"
                      : "text-theme-text-secondary hover:bg-theme-bg-hover hover:text-theme-text-primary"
                  }`}
                >
                  <Icon size={18} weight={isActive ? "fill" : "regular"} />
                  {badge && badge > 0 ? (
                    <span className="absolute right-0.5 top-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-[#009ee0] px-0.5 text-[9px] font-bold text-white">
                      {badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={closeSidebar}
            aria-label={t("common.closePanel", "Panel schließen")}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-theme-border text-theme-text-secondary transition-colors hover:bg-theme-bg-hover hover:text-theme-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-text-secondary"
          >
            <X size={18} />
          </button>
        </div>
      </div>,
      document.body,
    );
  }

  // ── Closed panel: FAB + optional bottom sheet ─────────────────────────
  return createPortal(
    <div className="md:hidden">
      <button
        type="button"
        aria-label={fabLabel}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
        className="fixed z-[100] flex h-12 w-12 items-center justify-center rounded-full border border-theme-border bg-theme-bg-sidebar text-theme-text-primary shadow-lg transition-colors hover:bg-theme-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-text-secondary"
        style={{
          right: "max(12px, env(safe-area-inset-right))",
          bottom: "max(16px, env(safe-area-inset-bottom))",
        }}
      >
        {open ? (
          <X size={20} />
        ) : (
          <SlidersHorizontal size={20} weight="regular" />
        )}
        {activeRunCount > 0 && !open ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#009ee0] px-1 text-[10px] font-bold text-white">
            {activeRunCount}
          </span>
        ) : null}
      </button>

      {open
        ? createPortal(
            <div
              className="fixed inset-0 z-[110] md:hidden"
              role="presentation"
            >
              <div
                className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
                aria-hidden
              />
              <div
                ref={sheetRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="absolute inset-x-0 bottom-0 max-h-[min(70vh,560px)] overflow-y-auto rounded-t-2xl border border-theme-border bg-theme-bg-sidebar shadow-2xl"
                style={{
                  paddingBottom: "max(16px, env(safe-area-inset-bottom))",
                }}
              >
                <div className="sticky top-0 z-10 flex flex-col items-center border-b border-theme-border bg-theme-bg-sidebar px-4 pb-3 pt-2">
                  <div
                    className="mb-2 h-1 w-10 rounded-full bg-theme-text-secondary/40"
                    aria-hidden
                  />
                  <div className="flex w-full items-center justify-between">
                    <h2
                      id={titleId}
                      className="text-sm font-semibold text-theme-text-primary"
                    >
                      {sheetTitle}
                    </h2>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      aria-label={t("common.close", "Schließen")}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-theme-text-secondary hover:bg-theme-bg-hover hover:text-theme-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-text-secondary"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <p className="mt-0.5 w-full text-left text-xs text-theme-text-secondary">
                    {t(
                      "common.toolsSheetHint",
                      "Notizen, Quellen, PDF und mehr — auch unterwegs.",
                    )}
                  </p>
                </div>

                <div
                  role="menu"
                  className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3"
                >
                  {items.map(({ id, Icon, label, badge }) => (
                    <button
                      key={id}
                      type="button"
                      role="menuitem"
                      onClick={() => selectTool(id)}
                      className="flex min-h-[52px] items-center gap-2.5 rounded-xl border border-theme-border/60 bg-[var(--chat-surface,transparent)] px-3 py-2.5 text-left text-sm text-theme-text-primary transition-colors hover:bg-theme-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-text-secondary active:scale-[0.98]"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-theme-bg-hover text-theme-text-secondary">
                        <Icon size={18} />
                      </span>
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {label}
                      </span>
                      {badge && badge > 0 ? (
                        <span className="rounded-full bg-[#009ee0] px-1.5 py-0.5 text-[10px] font-bold text-white">
                          {badge}
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>,
    document.body,
  );
}
