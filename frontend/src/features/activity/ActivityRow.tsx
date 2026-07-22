// SPDX-License-Identifier: MIT

import { CaretDown } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import ActivityStatusIcon from "./ActivityStatusIcon";
import { activityDuration } from "./duration";
import type { ActivityItem } from "./types";

interface ActivityRowProps {
  activity: ActivityItem;
  depth?: number;
  defaultOpen?: boolean;
}

export default function ActivityRow({ activity, depth = 0, defaultOpen = false }: ActivityRowProps) {
  const hasDetail = Boolean(activity.description) || Boolean(activity.output) || Boolean(activity.children?.length);

  const [open, setOpen] = useState(defaultOpen || activity.status === "running" || activity.status === "waiting");

  useEffect(() => {
    if (activity.status === "running" || activity.status === "waiting") {
      setOpen(true);
    }
  }, [activity.status]);

  const duration = activityDuration(activity.startedAt, activity.endedAt);

  return (
    <div className="activity-enter" style={{ marginLeft: depth > 0 ? `${depth * 14}px` : undefined }}>
      <button
        type="button"
        disabled={!hasDetail}
        onClick={() => hasDetail && setOpen((current) => !current)}
        className={[
          "group flex w-full items-start gap-2 rounded-lg px-1.5 py-1.5 text-left",
          "border-none bg-transparent transition-colors",
          hasDetail ? "hover:bg-theme-bg-secondary" : "cursor-default",
        ].join(" ")}
      >
        <ActivityStatusIcon status={activity.status} />

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className={[
                "truncate text-sm",
                activity.status === "running" ? "font-medium text-theme-text-primary" : "text-theme-text-secondary",
              ].join(" ")}
            >
              {activity.title}
            </span>

            {duration && (
              <span className="shrink-0 text-[10px] text-theme-text-muted">
                {duration}
              </span>
            )}
          </div>

          {activity.description && (
            <p className="mt-0.5 truncate text-xs text-theme-text-muted">
              {activity.description}
            </p>
          )}
        </div>

        {hasDetail && (
          <CaretDown
            size={13}
            className={[
              "mt-1 shrink-0 text-theme-text-muted transition-transform duration-200",
              open ? "rotate-180" : "",
            ].join(" ")}
          />
        )}
      </button>

      <div
        className={[
          "grid transition-[grid-template-rows,opacity] duration-200 ease-out",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        ].join(" ")}
      >
        <div className="overflow-hidden">
          <div className="ml-8 border-l border-theme-border pb-1 pl-2 pt-1">
            {activity.output && (
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-theme-bg-secondary p-2 text-[11px] leading-5 text-theme-text-secondary">
                {activity.output}
              </pre>
            )}

            {activity.children?.map((child) => (
              <ActivityRow key={child.id} activity={child} depth={depth + 1} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
