// SPDX-License-Identifier: MIT
// Purpose: Generic empty state with icon, title, description, and optional action.
// Docs: Based on Issue #607 Phase 1 + Issue #10 state components.
import React from "react";
import { cn } from "@/utils/cn";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  compact?: boolean;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-6 px-4" : "py-12 px-6",
      )}
    >
      {icon && (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-theme-bg-tertiary text-theme-text-muted">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-theme-text-primary">{title}</h3>
      {description && (
        <p className="mt-1 max-w-[280px] text-xs leading-relaxed text-theme-text-secondary">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
