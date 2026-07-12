// SPDX-License-Identifier: MIT
/**
 * Purpose: Three-dots overflow menu (fork / delete) for assistant chat messages.
 * Docs: ActionMenu/index.tsx (this file)
 */
import React, { useState, useEffect, useRef } from "react";
import { Trash } from "@phosphor-icons/react/dist/csr/Trash";
import { DotsThreeVertical } from "@phosphor-icons/react/dist/csr/DotsThreeVertical";
import { TreeView } from "@phosphor-icons/react/dist/csr/TreeView";
import { useTranslation } from "react-i18next";
import { messageActionButtonClass } from "../MessageActionButton";

function ActionMenu({ chatId, forkThread, isEditing, role }: any) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false as any);
  const menuRef = useRef<any>(null);

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

  useEffect(() => {
    if (!open) return;
    const handleClickOutside: any = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
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
    <div
      className="relative flex h-7 w-7 items-center justify-center"
      ref={menuRef}
    >
      <button
        type="button"
        onClick={toggleMenu}
        className={messageActionButtonClass}
        data-tooltip-id="action-menu"
        data-tooltip-content={t("chat_window.more_actions")}
        aria-label={t("chat_window.more_actions")}
      >
        <DotsThreeVertical size={20} weight="bold" />
      </button>
      {open && (
        <div className="absolute -top-1 left-7 mt-1 border-[1.5px] border-white/40 rounded-lg bg-theme-action-menu-bg flex flex-col shadow-[0_4px_14px_rgba(0,0,0,0.25)] text-theme-text-primary z-[99] md:z-10">
          <button
            type="button"
            onClick={handleFork}
            className="border-none rounded-t-lg flex items-center text-theme-text-primary gap-x-2 hover:bg-theme-action-menu-item-hover py-1.5 px-2 transition-colors duration-200 w-full text-left"
          >
            <TreeView size={18} />
            <span className="text-sm">{t("chat_window.fork")}</span>
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="border-none flex rounded-b-lg items-center text-theme-text-primary gap-x-2 hover:bg-theme-action-menu-item-hover py-1.5 px-2 transition-colors duration-200 w-full text-left"
          >
            <Trash size={18} />
            <span className="text-sm">{t("chat_window.delete")}</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default ActionMenu;
