// SPDX-License-Identifier: MIT
// Purpose: Progressive-disclosure menu for optional chat workspace panels.
import { useEffect, useRef, useState } from "react";
import { SlidersHorizontal } from "@phosphor-icons/react/dist/csr/SlidersHorizontal";
import { Eye } from "@phosphor-icons/react/dist/csr/Eye";
import { Database } from "@phosphor-icons/react/dist/csr/Database";
import { Newspaper } from "@phosphor-icons/react/dist/csr/Newspaper";
import { BookOpen } from "@phosphor-icons/react/dist/csr/BookOpen";
import { Notepad } from "@phosphor-icons/react/dist/csr/Notepad";
import { useTranslation } from "react-i18next";
import { useChatSidebar } from "../ChatSidebar";

type ToolId = "sources" | "preview" | "notepad" | "database" | "political";

export default function RightSidebarIconBar() {
  const { t } = useTranslation();
  const { activeSidebar, toggleSidebar } = useChatSidebar();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const tools: {
    id: ToolId;
    Icon: typeof Eye;
    label: string;
  }[] = [
    {
      id: "sources",
      Icon: BookOpen,
      label: t("right_sidebar.icon_sources", "Quellen"),
    },
    {
      id: "preview",
      Icon: Eye,
      label: t("right_sidebar.icon_preview", "Vorschau"),
    },
    {
      id: "notepad",
      Icon: Notepad,
      label: t("right_sidebar.icon_notepad", "Notizblock"),
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
  ];

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const menuLabel = t("common.rightSidebar", "Werkzeuge");

  return (
    <div
      ref={menuRef}
      className="relative z-[90] mt-3 mr-3 hidden shrink-0 md:block"
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={menuLabel}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`relative flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-medium shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-text-secondary ${
          open || activeSidebar
            ? "border-theme-border bg-theme-bg-hover text-theme-text-primary"
            : "border-theme-border bg-theme-bg-sidebar text-theme-text-secondary hover:bg-theme-bg-hover hover:text-theme-text-primary"
        }`}
      >
        <SlidersHorizontal size={16} weight={open ? "fill" : "regular"} />
        <span>{menuLabel}</span>
      </button>

      {open ? (
        <div
          role="menu"
          aria-label={menuLabel}
          className="absolute right-0 top-full mt-2 w-64 overflow-hidden rounded-xl border border-theme-border bg-theme-bg-sidebar p-1.5 shadow-2xl"
        >
          {tools.map(({ id, Icon, label }) => {
            const active = activeSidebar === id;
            return (
              <button
                key={id}
                type="button"
                role="menuitem"
                onClick={() => {
                  toggleSidebar(id);
                  setOpen(false);
                }}
                aria-current={active ? "page" : undefined}
                className={`flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm transition-colors ${
                  active
                    ? "bg-theme-bg-hover text-theme-text-primary"
                    : "text-theme-text-secondary hover:bg-theme-bg-hover hover:text-theme-text-primary"
                }`}
              >
                <Icon size={17} weight={active ? "fill" : "regular"} />
                <span className="min-w-0 flex-1 truncate">{label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
