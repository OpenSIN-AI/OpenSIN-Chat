// SPDX-License-Identifier: MIT
import { useRef, useEffect } from "react";
import type React from "react";
import { useTranslation } from "react-i18next";

export default function ContextMenu({
  contextMenu,
  closeContextMenu,
  files,
  selectedItems,
  setSelectedItems,
}: any) {
  const { t } = useTranslation();
  const contextMenuRef: any = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(event.target)
      ) {
        closeContextMenu();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [closeContextMenu]);

  const isAllSelected = () => {
    const allItems = files.items.flatMap((folder) => [
      folder.name,
      ...(folder.items as any).map((file) => file.id),
    ]);
    return allItems.every((item) => selectedItems[item]);
  };

  const toggleSelectAll = () => {
    if (isAllSelected()) {
      setSelectedItems({});
    } else {
      const newSelectedItems = {};
      files.items.forEach((folder) => {
        newSelectedItems[folder.name] = true;
        folder.items.forEach((file) => {
          newSelectedItems[file.id] = true;
        });
      });
      setSelectedItems(newSelectedItems);
    }
    closeContextMenu();
  };

  if (!contextMenu.visible) return null;

  return (
    <div
      ref={contextMenuRef}
      // Dynamic: position depends on click coordinates (runtime values)
      style={{
        "--context-menu-top": `${contextMenu.y}px`,
        "--context-menu-left": `${contextMenu.x}px`,
      } as React.CSSProperties}
      className="fixed z-[1000] bg-theme-bg-secondary border border-theme-modal-border rounded-md shadow-lg top-[var(--context-menu-top)] left-[var(--context-menu-left)]"
    >
      <button
        onClick={toggleSelectAll}
        className="block w-full text-left px-4 py-2 text-sm text-theme-text-primary hover:bg-theme-file-picker-hover"
      >
        {isAllSelected()
          ? t("contextMenu.unselectAll")
          : t("contextMenu.selectAll")}
      </button>
      <button
        onClick={closeContextMenu}
        className="block w-full text-left px-4 py-2 text-sm text-theme-text-primary hover:bg-theme-file-picker-hover"
      >
        {t("contextMenu.cancel")}
      </button>
    </div>
  );
}
