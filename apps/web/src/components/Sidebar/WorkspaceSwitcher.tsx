// SPDX-License-Identifier: MIT
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router";
import { CaretDown } from "@phosphor-icons/react/dist/csr/CaretDown";
import { Check } from "@phosphor-icons/react/dist/csr/Check";
import { CloudArrowUp } from "@phosphor-icons/react/dist/csr/CloudArrowUp";
import { GearSix } from "@phosphor-icons/react/dist/csr/GearSix";
import { Plus } from "@phosphor-icons/react/dist/csr/Plus";
import { SquaresFour } from "@phosphor-icons/react/dist/csr/SquaresFour";
import { useTranslation } from "react-i18next";
import useWorkspaces from "@/hooks/useWorkspaces";
import useUser from "@/hooks/useUser";
import paths from "@/utils/paths";
import { LAST_VISITED_WORKSPACE } from "@/utils/constants";
import { safeGetItem } from "@/utils/safeStorage";
import { safeJsonParse } from "@/utils/request";
import ManageWorkspace, {
  useManageWorkspaceModal,
} from "@/components/Modals/ManageWorkspace";

type WorkspaceSummary = {
  id?: number | string;
  slug: string;
  name?: string;
};

type StoredWorkspace = { slug?: string } | null;

type Props = { onCreate: () => void; onNavigate?: () => void };

const WORKSPACE_INITIAL_FALLBACK = "O";

type MenuPos = { top: number; left: number; width: number };

export default function WorkspaceSwitcher({ onCreate, onNavigate }: Props) {
  const { t } = useTranslation();
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();
  const { workspaces, isLoading } = useWorkspaces({ ordered: true });
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<MenuPos | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { showing, showModal, hideModal } = useManageWorkspaceModal();

  const activeWorkspace = useMemo(() => {
    const direct = workspaces.find(
      (workspace: WorkspaceSummary) => workspace.slug === slug,
    );
    if (direct) return direct;
    const last = safeJsonParse(
      safeGetItem(LAST_VISITED_WORKSPACE),
      null,
    ) as StoredWorkspace;
    return (
      workspaces.find(
        (workspace: WorkspaceSummary) => workspace.slug === last?.slug,
      ) || workspaces[0]
    );
  }, [slug, workspaces]);

  // Position the portaled menu under the trigger so it is never clipped by
  // the sidebar's overflow-hidden container.
  useLayoutEffect(() => {
    if (!open) {
      setMenuPos(null);
      return;
    }
    function reposition() {
      const el = triggerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const width = Math.min(320, Math.max(rect.width, 240));
      let left = rect.left;
      if (left + width > window.innerWidth - 8) {
        left = Math.max(8, window.innerWidth - width - 8);
      }
      setMenuPos({
        top: rect.bottom + 6,
        left,
        width,
      });
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
    if (!open) return;
    const close = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      )
        setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("mousedown", close);
    window.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", escape);
    };
  }, [open]);

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
    onNavigate?.();
  };

  const menu = open && menuPos && (
    <div
      ref={menuRef}
      role="menu"
      style={{
        position: "fixed",
        top: menuPos.top,
        left: menuPos.left,
        width: menuPos.width,
      }}
      className="z-[200] overflow-hidden rounded-xl border border-theme-modal-border bg-theme-bg-secondary p-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.18),0_2px_8px_rgba(0,0,0,0.08)]"
    >
      <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-wide text-theme-text-secondary">
        {t("sidebar.workspaces", "Workspaces")}
      </p>
      <div className="max-h-56 overflow-y-auto">
        {workspaces.map((workspace: WorkspaceSummary) => {
          const active = workspace.slug === activeWorkspace?.slug;
          return (
            <button
              key={workspace.id}
              type="button"
              role="menuitemradio"
              aria-checked={active}
              onClick={() => go(paths.workspace.chat(workspace.slug))}
              className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${active ? "bg-theme-sidebar-item-selected text-theme-sidebar-item-text-active" : "text-theme-text-secondary hover:bg-theme-bg-hover hover:text-theme-text-primary"}`}
            >
              <SquaresFour size={16} weight={active ? "fill" : "regular"} />
              <span className="min-w-0 flex-1 truncate">{workspace.name}</span>
              {active && <Check size={14} weight="bold" />}
            </button>
          );
        })}
      </div>
      <div className="my-1 h-px bg-theme-modal-border" />
      {user?.role !== "default" && (
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            setOpen(false);
            onCreate();
          }}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-theme-text-secondary transition-colors hover:bg-theme-bg-hover hover:text-theme-text-primary"
        >
          <Plus size={16} />
          {t("new-workspace.title")}
        </button>
      )}
      {activeWorkspace && user?.role !== "default" && (
        <>
          <button
            type="button"
            role="menuitem"
            onClick={() =>
              go(
                paths.workspace.settings.generalAppearance(
                  activeWorkspace.slug,
                ),
              )
            }
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-theme-text-secondary transition-colors hover:bg-theme-bg-hover hover:text-theme-text-primary"
          >
            <GearSix size={16} />
            {t("sidebar.workspaceSettings", "Workspace settings")}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              showModal();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-theme-text-secondary transition-colors hover:bg-theme-bg-hover hover:text-theme-text-primary"
          >
            <CloudArrowUp size={16} />
            {t("sidebar.workspaceCloud", "Workspace Cloud")}
          </button>
        </>
      )}
    </div>
  );

  return (
    <>
      <div className="relative min-w-0 flex-1">
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="flex h-9 w-full min-w-0 items-center gap-2 rounded-lg px-2 text-left text-theme-text-primary transition-colors hover:bg-theme-bg-hover"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-theme-modal-border bg-theme-bg-hover text-xs font-semibold text-theme-text-primary">
            {(activeWorkspace?.name || WORKSPACE_INITIAL_FALLBACK)
              .slice(0, 1)
              .toUpperCase()}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-semibold">
            {isLoading
              ? t("common.loading")
              : activeWorkspace?.name || "OpenSIN"}
          </span>
          <CaretDown
            size={14}
            className={`shrink-0 text-theme-text-secondary transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      </div>
      {menu && createPortal(menu, document.body)}
      {showing &&
        activeWorkspace &&
        createPortal(
          <ManageWorkspace
            hideModal={hideModal}
            providedSlug={activeWorkspace.slug}
          />,
          document.body,
        )}
    </>
  );
}
