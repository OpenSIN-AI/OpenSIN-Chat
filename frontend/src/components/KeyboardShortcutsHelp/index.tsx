// SPDX-License-Identifier: MIT
import { useEffect, useRef, useState } from "react";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { useTranslation } from "react-i18next";
import {
  SHORTCUTS,
  isMac,
  KEYBOARD_SHORTCUTS_HELP_EVENT,
} from "@/utils/keyboardShortcuts";

export default function KeyboardShortcutsHelp() {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const toggle = () => setIsOpen((prev) => !prev);
    window.addEventListener(KEYBOARD_SHORTCUTS_HELP_EVENT, toggle);
    return () => {
      window.removeEventListener(KEYBOARD_SHORTCUTS_HELP_EVENT, toggle);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    previousActiveElement.current =
      (document.activeElement as HTMLElement) ?? null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setIsOpen(false);
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll(
          'button, a, input, textarea, select, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0] as HTMLElement;
        const last = focusable[focusable.length - 1] as HTMLElement;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    closeButtonRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      previousActiveElement.current?.focus?.();
    };
  }, [isOpen]);

  if (!isOpen) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("keyboard-shortcuts.title")}
      className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center"
      onClick={() => setIsOpen(false)}
    >
      <div
        ref={dialogRef}
        className="relative bg-theme-bg-secondary rounded-lg p-6 max-w-2xl w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-theme-text-primary">
            {t("keyboard-shortcuts.title")}
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => setIsOpen(false)}
            className="text-theme-text-primary hover:text-theme-text-secondary transition-colors"
            aria-label={t("keyboardShortcuts.closeButton")}
          >
            <X size={24} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(SHORTCUTS).map(([key, shortcut]) => (
            <div
              key={key}
              className="flex items-center justify-between p-3 bg-theme-bg-hover rounded-lg"
            >
              <span className="text-theme-text-primary">
                {t(`keyboard-shortcuts.shortcuts.${shortcut.translationKey}`)}
              </span>
              <kbd className="px-2 py-1 bg-theme-bg-primary text-theme-text-primary rounded border border-theme-sidebar-border">
                {/* eslint-disable-next-line i18next/no-literal-string */}
                {isMac ? key : key.replace("⌘", "Ctrl")}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
