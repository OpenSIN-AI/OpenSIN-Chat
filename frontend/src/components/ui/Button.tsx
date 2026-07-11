// SPDX-License-Identifier: MIT
// Purpose: Theme-aware Button primitive with variant/size/loading support.
// Docs: Based on Issue #607 Phase 1 design tokens.
import React, { forwardRef } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/utils/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  isFullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-theme-bg-primary text-theme-text-inverse hover:opacity-90",
  secondary:
    "bg-theme-bg-tertiary text-theme-text-primary border border-theme-border hover:bg-theme-bg-hover",
  ghost:
    "bg-transparent text-theme-text-secondary hover:bg-theme-bg-tertiary hover:text-theme-text-primary",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-2.5 py-1 text-xs rounded-md",
  md: "px-4 py-2 text-sm rounded-lg",
  lg: "px-6 py-2.5 text-base rounded-lg",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      isFullWidth = false,
      disabled,
      children,
      className,
      type = "button",
      ...props
    },
    ref,
  ) => {
    const { t } = useTranslation();
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-medium transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-text-secondary",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          variantClasses[variant],
          sizeClasses[size],
          isFullWidth && "w-full",
          className,
        )}
        {...props}
      >
        {loading ? t("ui.loading") : children}
      </button>
    );
  },
);

Button.displayName = "Button";
