// SPDX-License-Identifier: MIT
// Purpose: Workspace header — consistent header bar for panels and workspace area.
// Docs: Based on Issue #607 §7 PanelHeader spec.
import React from "react";
import { cn } from "@/utils/cn";

interface WorkspaceHeaderProps {
  children?: React.ReactNode;
  className?: string;
}

export function WorkspaceHeader({ children, className }: WorkspaceHeaderProps) {
  return (
    <header
      className={cn(
        "flex h-8 shrink-0 items-center justify-between border-b border-theme-border px-4",
        className,
      )}
    >
      {children}
    </header>
  );
}
