// SPDX-License-Identifier: MIT
// Purpose: Shared panel header with icon, title, count, actions, and close button.
// Docs: Based on Issue #607 Phase 1 + Issue #7 PanelHeader spec.
import React from "react";
import { useTranslation } from "react-i18next";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { IconButton } from "./IconButton";
import { cn } from "@/utils/cn";

interface PanelHeaderProps {
  title: string;
  icon?: React.ReactNode;
  count?: number;
  actions?: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export function PanelHeader({
  title,
  icon,
  count,
  actions,
  onClose,
  className,
}: PanelHeaderProps) {
  const { t } = useTranslation();
  return (
    <header
      className={cn(
        "flex h-12 shrink-0 items-center gap-2 border-b border-theme-border px-3",
        className,
      )}
    >
      {icon && (
        <span
          className="flex-shrink-0 text-theme-text-secondary"
          aria-hidden="true"
        >
          {icon}
        </span>
      )}
      <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-theme-text-primary">
        {title}
      </h2>
      {typeof count === "number" && (
        <span className="flex-shrink-0 text-xs text-theme-text-secondary">
          {count}
        </span>
      )}
      {actions && (
        <div className="flex flex-shrink-0 items-center gap-1">{actions}</div>
      )}
      {onClose && (
        <IconButton
          icon={<X size={16} />}
          label={t("common.closePanel", { title })}
          onClick={onClose}
          size="sm"
        />
      )}
    </header>
  );
}
