// SPDX-License-Identifier: MIT
/**
 * ToolbarButton — shared pill-style action button used in the document
 * picker toolbar (Directory, WorkspaceDirectory, FileTree).
 *
 * Eliminates the repeated 120-character className string that was duplicated
 * across 7 button elements in 3 files, including 4x duplicate utility classes
 * in a single string (light:hover:text-theme-text-primary appeared 2–4 times).
 *
 * Usage:
 *   <ToolbarButton onClick={fn}>Move to workspace</ToolbarButton>
 *   <ToolbarButton iconOnly onClick={fn} aria-label="Delete selected">
 *     <Trash size={18} />
 *   </ToolbarButton>
 */
import React from "react";

// Base classes shared by every variant — dark default, light override.
const BASE =
  "border-none text-sm font-semibold rounded-lg " +
  "bg-white light:bg-[#E0F2FE] " +
  "hover:bg-neutral-800/80 hover:text-theme-text-primary " +
  "light:text-[#026AA2] light:hover:bg-[#026AA2] light:hover:text-theme-text-primary";

type ToolbarButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** When true, renders a square 32 × 32 px icon-only button. */
  iconOnly?: boolean;
};

export default function ToolbarButton({
  iconOnly = false,
  className = "",
  children,
  type = "button",
  ...rest
}: ToolbarButtonProps) {
  const sizeClasses = iconOnly
    ? "h-[32px] w-[32px] flex justify-center items-center"
    : "h-[30px] px-2.5";

  return (
    <button
      // eslint-disable-next-line react/button-has-type
      type={type}
      className={`${BASE} ${sizeClasses} ${className}`.trim()}
      {...rest}
    >
      {children}
    </button>
  );
}
