// SPDX-License-Identifier: MIT
/**
 * Purpose: Three-dots overflow menu (fork / delete) for assistant chat messages.
 * Docs: ActionMenu/index.tsx (this file)
 */
import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { Trash } from "@phosphor-icons/react/dist/csr/Trash";
import { DotsThreeVertical } from "@phosphor-icons/react/dist/csr/DotsThreeVertical";
import { TreeView } from "@phosphor-icons/react/dist/csr/TreeView";
import { useTranslation } from "react-i18next";
import { messageActionButtonClass } from "../MessageActionButton";

function ActionMenu({ chatId, forkThread, isEditing, role }: any) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false as any);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const menuRef = useRef<any>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const toggleMenu = () => setOpen(!open);

  const handleFork = () => {
    forkThread(chatId);
    setOpen(false);
  };

  const handleDelete = () => {
    window.dispatchEvent(
      new CustomEvent("delete-message", { detail: { chatId } }),
    );
    setOpen(false);
  };

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    function reposition() {
      const el = triggerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      // Prefer opening to the right; flip left near the edge.
      const menuWidth = 160;
      let left = rect.right + 4;
      if (left + menuWidth > window.innerWidth - 8) {
        left = Math.max(8, rect.left - menuWidth - 4);
      }
      // Prefer above the button so it isn't clipped by the composer.
      let top = rect.top - 4;
      if (top < 8) top = rect.bottom + 4;
      setPos({ top, left });
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
    const handleClickOutside: any = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        !triggerRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  if (!chatId || isEditing || role === "user") return null;

  return (
    <div className="relative flex h-7 w-7 items-center justify-center">
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleMenu}
        className={messageActionButtonClass}
        data-tooltip-id="action-menu"
        data-tooltip-content={t("chat_window.more_actions")}
        aria-label={t("chat_window.more_actions")}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <DotsThreeVertical size={20} weight="bold" />
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ position: "fixed", top: pos.top, left: pos.left }}
            className="z-[300] border-[1.5px] border-white/40 rounded-lg bg-theme-action-menu-bg flex flex-col shadow-[0_4px_14px_rgba(0,0,0,0.25)] text-theme-text-primary"
          >
            <button
              type="button"
              role="menuitem"
              onClick={handleFork}
              className="border-none rounded-t-lg flex items-center text-theme-text-primary gap-x-2 hover:bg-theme-action-menu-item-hover py-1.5 px-2 transition-colors duration-200 w-full text-left"
            >
              <TreeView size={18} />
              <span className="text-sm">{t("chat_window.fork")}</span>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={handleDelete}
              className="border-none flex rounded-b-lg items-center text-theme-text-primary gap-x-2 hover:bg-theme-action-menu-item-hover py-1.5 px-2 transition-colors duration-200 w-full text-left"
            >
              <Trash size={18} />
              <span className="text-sm">{t("chat_window.delete")}</span>
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
}

export default ActionMenu;
