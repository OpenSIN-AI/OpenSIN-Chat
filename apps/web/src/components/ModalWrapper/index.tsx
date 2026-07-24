// SPDX-License-Identifier: MIT
import { type MouseEvent, type ReactNode, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface ModalWrapperProps {
  children: ReactNode;
  isOpen: boolean;
  noPortal?: boolean;
  closeModal?: () => void;
  ariaLabel?: string;
  ariaLabelledBy?: string;
}

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

let bodyLockCount = 0;
let originalBodyOverflow = "";

function lockBodyScroll(): void {
  if (bodyLockCount === 0) {
    originalBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  bodyLockCount += 1;
}

function unlockBodyScroll(): void {
  bodyLockCount = Math.max(0, bodyLockCount - 1);
  if (bodyLockCount === 0) {
    document.body.style.overflow = originalBodyOverflow;
  }
}

export default function ModalWrapper({
  children,
  isOpen,
  noPortal = false,
  closeModal,
  ariaLabel,
  ariaLabelledBy,
}: ModalWrapperProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const closeModalRef = useRef(closeModal);

  useEffect(() => {
    closeModalRef.current = closeModal;
  }, [closeModal]);

  useEffect(() => {
    if (!isOpen) return undefined;

    previousActiveElement.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    lockBodyScroll();

    const dialog = dialogRef.current;
    const focusTimer = window.setTimeout(() => {
      const first = dialog?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      (first ?? dialog)?.focus();
    }, 0);

    function handleKeyDown(event: KeyboardEvent) {
      if (!dialog) return;

      if (event.key === "Escape") {
        if (closeModalRef.current) {
          event.preventDefault();
          event.stopPropagation();
          closeModalRef.current();
        }
        return;
      }

      if (event.key !== "Tab") return;
      const focusables = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter(
        (element) =>
          !element.hasAttribute("aria-hidden") &&
          element.getAttribute("aria-disabled") !== "true",
      );

      if (focusables.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || !dialog.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown, true);
      unlockBodyScroll();

      const previous = previousActiveElement.current;
      if (previous && document.contains(previous)) previous.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) closeModalRef.current?.();
  }

  const modal = (
    <div
      ref={dialogRef}
      className="fixed left-0 top-0 z-[99] flex h-screen w-screen items-center justify-center bg-black/60 backdrop-blur-sm outline-none"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabelledBy ? undefined : ariaLabel || "Dialog"}
      aria-labelledby={ariaLabelledBy}
      tabIndex={-1}
    >
      {children}
    </div>
  );

  return noPortal ? modal : createPortal(modal, document.body);
}
