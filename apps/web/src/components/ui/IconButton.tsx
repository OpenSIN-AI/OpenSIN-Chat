// SPDX-License-Identifier: MIT
// Purpose: Compact icon-only button with tooltip and accessible label.
// Docs: Based on Issue #607 Phase 1 design tokens.
import React from "react";
import { cn } from "@/utils/cn";

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label: string;
  variant?: "ghost" | "primary" | "danger";
  size?: "sm" | "md";
  pressed?: boolean;
  ref?: React.Ref<HTMLButtonElement>;
}

const variantClasses = {
  ghost:
    "border-transparent text-theme-text-secondary hover:bg-theme-control-hover hover:text-theme-text-primary",
  primary:
    "border-transparent bg-theme-button-primary text-theme-text-inverse shadow-sm hover:bg-theme-button-primary-hover",
  danger:
    "border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-400",
};

const sizeClasses = {
  sm: "h-7 w-7",
  md: "h-9 w-9",
};

export function IconButton({
  icon,
  label,
  variant = "ghost",
  size = "md",
  pressed,
  disabled,
  className,
  type = "button",
  ref,
  ...props
}: IconButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center rounded-md border cursor-pointer transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-focus focus-visible:ring-offset-2 focus-visible:ring-offset-theme-bg-primary",
        "disabled:cursor-not-allowed disabled:border-transparent disabled:bg-theme-button-disabled disabled:text-theme-text-muted disabled:opacity-50 disabled:shadow-none",
        variantClasses[variant],
        sizeClasses[size],
        pressed && "bg-theme-button-secondary text-theme-text-primary",
        className,
      )}
      {...props}
    >
      {icon}
    </button>
  );
}
