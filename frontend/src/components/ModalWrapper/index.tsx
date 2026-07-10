// SPDX-License-Identifier: MIT
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
/**
 * @typedef {Object} ModalWrapperProps
 * @property {import("react").ReactComponentElement} children - The DOM/JSX to render
 * @property {boolean} isOpen - Option that renders the modal
 * @property {boolean} noPortal - (default: false) Used for creating sub-DOM modals that need to be rendered as a child element instead of a modal placed at the root
 * Note: This can impact the bg-overlay presentation due to conflicting DOM positions so if using this property you should
    double check it renders as desired.
 * @property {Function} [closeModal] - Optional callback to close the modal. When provided, Escape key and backdrop click will dismiss the modal.
 */

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/**
 *
 * @param {ModalWrapperProps} props - ModalWrapperProps to pass
 * @returns {import("react").ReactNode}
 */
export default function ModalWrapper({
  children,
  isOpen,
  noPortal = false,
  closeModal,
  ariaLabel,
}: any) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previousActiveElement.current =
      (document.activeElement as HTMLElement) ?? null;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const dialog = dialogRef.current;
    const focusFirst = () => {
      if (!dialog) return;
      const first = dialog.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      if (first) first.focus();
      else if (dialog) dialog.focus();
    };
    const focusTimer = window.setTimeout(focusFirst, 0);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (closeModal) {
          e.stopPropagation();
          closeModal();
        }
        return;
      }
      if (e.key !== "Tab" || !dialog) return;
      const focusables = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => !el.hasAttribute("aria-hidden"));
      if (focusables.length === 0) {
        e.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (active === first || !dialog.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown, true);
      document.body.style.overflow = prevOverflow;
      const previously = previousActiveElement.current;
      if (
        previously &&
        typeof previously.focus === "function" &&
        document.contains(previously)
      ) {
        previously.focus();
      }
    };
  }, [isOpen, closeModal]);

  if (!isOpen) return null;

  const modalContent = closeModal ? (
    <div onClick={(e: any) => e.stopPropagation()}>{children}</div>
  ) : (
    children
  );

  const modal = (
    <div
      ref={dialogRef}
      className="bg-black/60 backdrop-blur-sm fixed top-0 left-0 outline-none w-screen h-screen flex items-center justify-center z-[99]"
      onClick={closeModal ? closeModal : undefined}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel || undefined}
      tabIndex={-1}
    >
      {modalContent}
    </div>
  );

  if (noPortal) return modal;

  return createPortal(modal, document.getElementById("root"));
}
