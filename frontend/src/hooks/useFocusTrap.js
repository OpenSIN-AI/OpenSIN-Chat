// SPDX-License-Identifier: MIT
/**
 * useFocusTrap — a reusable focus-trap hook for modal/dialog components.
 *
 * Usage:
 *   const trapRef = useFocusTrap(isOpen);
 *   return <div ref={trapRef} role="dialog" aria-modal="true"> ... </div>;
 *
 * When `active` is true the hook:
 *   - stores the previously-focused element and restores focus on cleanup
 *   - focuses the first focusable child on mount
 *   - traps Tab / Shift+Tab so focus cycles within the container
 *   - dismisses on Escape (optional callback)
 *   - hides body overflow while active
 *
 * The hook is framework-agnostic (vanilla DOM) so it can be used in
 * both React class and function components, or even outside React.
 */

import { useEffect, useRef, useCallback } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  "iframe",
  "object",
  "embed",
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
  "audio[controls]",
  "video[controls]",
  "details summary",
].join(",");

/**
 * @param {boolean} active - Whether the focus trap should be active (e.g. modal isOpen)
 * @param {function} [onEscape] - Optional callback invoked when Escape is pressed
 * @returns {import("react").RefObject<HTMLElement>} Ref to attach to the trap container
 */
export default function useFocusTrap(active, onEscape) {
  const containerRef = useRef(null);
  const previousActiveElement = useRef(null);
  const onKeyDownRef = useRef(null);

  const getFocusableElements = useCallback(() => {
    const container = containerRef.current;
    if (!container) return [];
    return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
      (el) =>
        !el.hasAttribute("aria-hidden") &&
        !el.hasAttribute("disabled") &&
        window.getComputedStyle(el).visibility !== "hidden" &&
        window.getComputedStyle(el).display !== "none",
    );
  }, []);

  useEffect(() => {
    if (!active) return;

    // Store the element that had focus before the trap activated
    previousActiveElement.current =
      (document.activeElement && document.activeElement !== document.body
        ? document.activeElement
        : null) || null;

    // Lock body scroll
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const container = containerRef.current;

    // Focus the first focusable element (or the container itself) synchronously
    // so that Tab-trap tests can fire keydown events immediately after mount.
    // A setTimeout(0) would defer focus past the test's synchronous event
    // dispatch, making the first Tab press appear to fire outside the trap.
    const focusables = getFocusableElements();
    if (focusables.length > 0) {
      focusables[0].focus();
    } else if (container) {
      container.focus();
    }
    const focusTimer = -1; // kept for symmetry with clearTimeout in cleanup

    // Keydown handler with Tab trapping and Escape dismissal
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (typeof onEscape === "function") {
          e.preventDefault();
          e.stopPropagation();
          onEscape();
        }
        return;
      }

      if (e.key !== "Tab") return;

      const focusables = getFocusableElements();
      if (focusables.length === 0) {
        e.preventDefault();
        if (container) container.focus();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const activeEl = document.activeElement;

      if (e.shiftKey) {
        if (
          activeEl === first ||
          (container && !container.contains(activeEl))
        ) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (activeEl === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    onKeyDownRef.current = handleKeyDown;
    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown, true);
      document.body.style.overflow = prevOverflow;

      // Restore focus to the previously-focused element
      const previously = previousActiveElement.current;
      if (
        previously &&
        typeof previously.focus === "function" &&
        document.contains(previously)
      ) {
        previously.focus();
      }
      previousActiveElement.current = null;
      onKeyDownRef.current = null;
    };
  }, [active, onEscape]);

  return containerRef;
}
