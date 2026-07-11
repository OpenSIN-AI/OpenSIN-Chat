// SPDX-License-Identifier: MIT
// Purpose: Compact icon rail for right-side workspace tools — visually matches left sidebar icon area.
// Docs: Based on Issue #607 Phase 2 UtilityRail spec.
import React from "react";
import { Tooltip } from "react-tooltip";
import { cn } from "@/utils/cn";

interface RailItem {
  id: string;
  icon: React.ComponentType<{ size: number; weight?: string }>;
  label: string;
  badge?: number;
}

interface UtilityRailProps {
  activePanel: string | null;
  onToggle: (id: string) => void;
  items: RailItem[];
  separatorAfter?: string[];
  className?: string;
}

export function UtilityRail({
  activePanel,
  onToggle,
  items,
  separatorAfter = [],
  className,
}: UtilityRailProps) {
  return (
    <nav
      aria-label="Workspace-Werkzeuge"
      className={cn(
        "hidden h-full w-12 flex-shrink-0 flex-col items-center gap-0.5 overflow-y-auto border-l border-theme-border bg-theme-bg-sidebar py-2.5 md:flex",
        className,
      )}
    >
      {items.map((item) => {
        const isActive = activePanel === item.id;
        const Icon = item.icon;
        const showSeparator = separatorAfter.includes(item.id);

        return (
          <React.Fragment key={item.id}>
            <div
              className="relative flex flex-col items-center"
              data-tooltip-id={`rail-${item.id}`}
              data-tooltip-content={item.label}
            >
              <button
                type="button"
                onClick={() => onToggle(item.id)}
                aria-label={item.label}
                aria-pressed={isActive}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg border-none cursor-pointer transition-colors duration-150",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-text-secondary",
                  isActive
                    ? "bg-theme-bg-hover text-theme-text-primary"
                    : "text-theme-text-secondary hover:bg-theme-bg-hover hover:text-theme-text-primary",
                )}
              >
                <Icon size={17} weight={isActive ? "fill" : "regular"} />
              </button>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#009ee0] px-1 text-[10px] font-bold text-white">
                  {item.badge}
                </span>
              )}
              <Tooltip
                id={`rail-${item.id}`}
                place="left"
                delayShow={300}
                positionStrategy="fixed"
                className="tooltip !text-xs z-[99]"
              />
            </div>
            {showSeparator && (
              <div
                className="my-1.5 h-px w-5 bg-theme-border"
                aria-hidden="true"
              />
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
