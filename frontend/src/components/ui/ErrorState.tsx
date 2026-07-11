// SPDX-License-Identifier: MIT
// Purpose: Error state with title, description, and optional retry action.
// Docs: Based on Issue #607 Phase 1 + Issue #10 error components.
import React from "react";
import { WarningCircle } from "@phosphor-icons/react/dist/csr/WarningCircle";
import { EmptyState } from "./EmptyState";
import { Button } from "./Button";

interface ErrorStateProps {
  title?: string;
  description?: string;
  retryLabel?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Inhalt konnte nicht geladen werden",
  description = "Prüfe die Verbindung und versuche es erneut.",
  retryLabel = "Erneut versuchen",
  onRetry,
}: ErrorStateProps) {
  return (
    <EmptyState
      icon={<WarningCircle size={24} className="text-red-500" />}
      title={title}
      description={description}
      action={
        onRetry ? (
          <Button size="sm" variant="secondary" onClick={onRetry}>
            {retryLabel}
          </Button>
        ) : undefined
      }
    />
  );
}
