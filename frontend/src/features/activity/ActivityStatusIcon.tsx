// SPDX-License-Identifier: MIT

import { Check, Warning, X } from "@phosphor-icons/react";
import type { ActivityStatus } from "./types";

interface ActivityStatusIconProps {
  status: ActivityStatus;
}

export default function ActivityStatusIcon({ status }: ActivityStatusIconProps) {
  if (status === "done") {
    return (
      <span className="flex h-5 w-5 items-center justify-center text-theme-text-secondary">
        <Check size={14} weight="bold" />
      </span>
    );
  }

  if (status === "error") {
    return (
      <span className="flex h-5 w-5 items-center justify-center text-red-400">
        <X size={14} weight="bold" />
      </span>
    );
  }

  if (status === "waiting") {
    return (
      <span className="flex h-5 w-5 items-center justify-center text-amber-400">
        <Warning size={14} weight="fill" />
      </span>
    );
  }

  if (status === "cancelled") {
    return (
      <span className="flex h-5 w-5 items-center justify-center text-theme-text-muted">
        <X size={12} />
      </span>
    );
  }

  return (
    <span aria-label="In Arbeit" className="relative flex h-5 w-5 items-center justify-center">
      <span className="absolute h-2 w-2 rounded-full bg-theme-text-secondary opacity-30 motion-safe:animate-ping" />
      <span className="relative h-1.5 w-1.5 rounded-full bg-theme-text-secondary" />
    </span>
  );
}
