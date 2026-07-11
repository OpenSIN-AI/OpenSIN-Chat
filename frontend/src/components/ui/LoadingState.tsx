// SPDX-License-Identifier: MIT
// Purpose: Loading state with skeleton rows that approximate the later structure.
// Docs: Based on Issue #607 Phase 1 + Issue #10 skeleton rules.
import React from "react";
import { cn } from "@/utils/cn";

interface LoadingStateProps {
  label: string;
  rows?: number;
}

export function LoadingState({ label, rows = 5 }: LoadingStateProps) {
  return (
    <div className="flex flex-col gap-3 p-4" role="status" aria-label={label}>
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "h-10 animate-pulse rounded-lg bg-theme-bg-tertiary",
            index === 0 && "h-8 w-2/3",
          )}
        />
      ))}
    </div>
  );
}
