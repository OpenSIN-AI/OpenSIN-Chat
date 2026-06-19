// SPDX-License-Identifier: MIT
import { useEffect } from "react";
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
}: any) {
  useEffect(() => {
    if (!closeModal) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [closeModal]);

  if (!isOpen) return null;

  const modalContent = closeModal ? (
    <div onClick={(e: any) => e.stopPropagation()}>{children}</div>
  ) : (
    children
  );

  const modal = (
    <div
      className="bg-black/60 backdrop-blur-sm fixed top-0 left-0 outline-none w-screen h-screen flex items-center justify-center z-99"
      onClick={closeModal ? closeModal : undefined}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
    >
      {modalContent}
    </div>
  );

  if (noPortal) return modal;

  return createPortal(modal, document.getElementById("root"));
}
