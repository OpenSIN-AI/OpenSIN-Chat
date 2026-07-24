// SPDX-License-Identifier: MIT
// Purpose: Shared panel shell — header + scrollable content + optional footer.
// Docs: Based on Issue #607 Phase 1 + Issue #7 UtilityPanel spec.
import React from "react";
import { PanelHeader } from "./PanelHeader";
import { cn } from "@/utils/cn";

interface UtilityPanelProps {
  title: string;
  icon?: React.ReactNode;
  count?: number;
  actions?: React.ReactNode;
  onClose?: () => void;
  toolbar?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function UtilityPanel({
  title,
  icon,
  count,
  actions,
  onClose,
  toolbar,
  footer,
  children,
  className,
}: UtilityPanelProps) {
  return (
    <div
      className={cn(
        "flex h-full flex-col overflow-hidden bg-theme-bg-sidebar",
        className,
      )}
    >
      <PanelHeader
        title={title}
        icon={icon}
        count={count}
        actions={actions}
        onClose={onClose}
      />
      {toolbar && (
        <div className="flex shrink-0 items-center gap-2 border-b border-theme-border px-3 py-2">
          {toolbar}
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      {footer && (
        <div className="flex shrink-0 items-center border-t border-theme-border px-3 py-2">
          {footer}
        </div>
      )}
    </div>
  );
}
