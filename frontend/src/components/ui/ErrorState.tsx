// SPDX-License-Identifier: MIT
// Purpose: Generic error state with warning icon, title, optional description, stringified error details, and optional retry action.
// Docs: Based on Issue #633 — unified Loading/Error/Empty states for document directory (ref. EmptyState/LoadingState + NotepadWorkspace).
import React from "react";
import { Warning } from "@phosphor-icons/react/dist/csr/Warning";
import { useTranslation } from "react-i18next";
import { cn } from "@/utils/cn";
import { Button } from "@/components/ui/Button";

interface ErrorStateProps {
  title: string;
  description?: string;
  error?: unknown;
  onRetry?: () => void;
  compact?: boolean;
}

export function ErrorState({
  title,
  description,
  error,
  onRetry,
  compact = false,
}: ErrorStateProps) {
  const { t } = useTranslation();
  const errorMessage =
    error != null
      ? typeof error === "string"
        ? error
        : error instanceof Error
          ? error.message
          : String(error)
      : null;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-6 px-4" : "py-12 px-6",
      )}
    >
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-theme-bg-tertiary text-theme-text-muted">
        <Warning size={24} weight="fill" />
      </div>
      <h3 className="text-sm font-semibold text-theme-text-primary">{title}</h3>
      {description && (
        <p className="mt-1 max-w-[280px] text-xs leading-relaxed text-theme-text-secondary">
          {description}
        </p>
      )}
      {errorMessage && (
        <p className="mt-1 max-w-[280px] break-all text-[10px] leading-snug text-theme-text-secondary">
          {errorMessage}
        </p>
      )}
      {onRetry && (
        <div className="mt-4">
          <Button size="sm" onClick={onRetry}>
            {t("common.retry")}
          </Button>
        </div>
      )}
    </div>
  );
}
