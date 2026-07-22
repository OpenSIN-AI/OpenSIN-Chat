// SPDX-License-Identifier: MIT

import { CaretDown, CheckCircle } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { useAgentRuns } from "@/components/WorkspaceChat/ChatContainer/AgentSessionsSidebar/AgentRunsContext";
import { runsToActivities } from "./agent-run-adapter";
import ActivityRow from "./ActivityRow";

function countActivities(activities: ReturnType<typeof runsToActivities>): number {
  return activities.reduce(
    (count, activity) => count + 1 + countActivities(activity.children || []),
    0,
  );
}

export default function ChatActivity() {
  const { runTree, activeRunCount } = useAgentRuns();
  const activities = useMemo(() => runsToActivities(runTree), [runTree]);
  const [open, setOpen] = useState(true);
  const working = activeRunCount > 0;

  useEffect(() => {
    if (working) setOpen(true);
  }, [working]);

  if (!activities.length) return null;

  const total = countActivities(activities);

  return (
    <section aria-label="Arbeitsfortschritt" className="activity-enter mb-3 w-full max-w-3xl">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center gap-2 rounded-lg border-none bg-transparent px-1 py-1.5 text-left hover:bg-theme-bg-secondary"
      >
        {working ? (
          <span className="relative flex h-5 w-5 items-center justify-center">
            <span className="absolute h-2.5 w-2.5 rounded-full bg-theme-text-secondary opacity-20 motion-safe:animate-ping" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-theme-text-secondary" />
          </span>
        ) : (
          <CheckCircle size={17} className="text-theme-text-secondary" />
        )}

        <span className="flex-1 text-sm text-theme-text-secondary">
          {working
            ? "Arbeitet an der Anfrage"
            : `${total} Arbeitsschritt${total === 1 ? "" : "e"} abgeschlossen`}
        </span>

        <span className="text-xs text-theme-text-muted">Details</span>

        <CaretDown
          size={13}
          className={[
            "text-theme-text-muted transition-transform duration-200",
            open ? "rotate-180" : "",
          ].join(" ")}
        />
      </button>

      <div
        className={[
          "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        ].join(" ")}
      >
        <div className="overflow-hidden">
          <div className="mt-1 flex flex-col gap-0.5">
            {activities.map((activity) => (
              <ActivityRow key={activity.id} activity={activity} defaultOpen={working} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
