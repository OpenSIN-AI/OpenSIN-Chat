// SPDX-License-Identifier: MIT
// Purpose: Compact icon-only button with tooltip and accessible label.
// Docs: Based on Issue #607 Phase 1 design tokens.
import React, { forwardRef } from "react";
import { cn } from "@/utils/cn";

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label: string;
  variant?: "ghost" | "primary" | "danger";
  size?: "sm" | "md";
  pressed?: boolean;
}

const variantClasses = {
  ghost:
    "text-theme-text-secondary hover:bg-theme-bg-tertiary hover:text-theme-text-primary",
  primary: "bg-theme-bg-primary text-theme-text-inverse hover:opacity-90",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

const sizeClasses = {
  sm: "h-7 w-7",
  md: "h-9 w-9",
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon,
      label,
      variant = "ghost",
      size = "md",
      pressed,
      disabled,
      className,
      type = "button",
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        aria-label={label}
        aria-pressed={pressed}
        disabled={disabled}
        className={cn(
          "inline-flex items-center justify-center rounded-lg border-none cursor-pointer transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-text-secondary",
          "disabled:opacity-40 disabled:cursor-not-allowed",
          variantClasses[variant],
          sizeClasses[size],
          pressed && "bg-theme-bg-tertiary text-theme-text-primary",
          className,
        )}
        {...props}
      >
        {icon}
      </button>
    );
  },
);

IconButton.displayName = "IconButton";
