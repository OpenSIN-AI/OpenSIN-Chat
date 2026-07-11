// SPDX-License-Identifier: MIT
// Purpose: Permission denied state for restricted areas.
// Docs: Based on Issue #607 Phase 1 + Issue #10 permission state.
import React from "react";
import { Lock } from "@phosphor-icons/react/dist/csr/Lock";
import { EmptyState } from "./EmptyState";

interface PermissionStateProps {
  title?: string;
  description?: string;
}

export function PermissionState({
  title = "Kein Zugriff",
  description = "Du hast keine Berechtigung für diesen Bereich.",
}: PermissionStateProps) {
  return (
    <EmptyState
      icon={<Lock size={24} className="text-theme-text-muted" />}
      title={title}
      description={description}
    />
  );
}
