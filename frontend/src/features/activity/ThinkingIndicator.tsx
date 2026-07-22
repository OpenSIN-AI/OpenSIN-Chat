// SPDX-License-Identifier: MIT

import { useAgentRuns } from "@/components/WorkspaceChat/ChatContainer/AgentSessionsSidebar/AgentRunsContext";

interface ThinkingIndicatorProps {
  visible: boolean;
}

export default function ThinkingIndicator({ visible }: ThinkingIndicatorProps) {
  const { activeRunCount } = useAgentRuns();

  if (!visible || activeRunCount > 0) return null;

  return (
    <div role="status" aria-live="polite" className="activity-enter flex items-center gap-2 py-2 text-sm text-theme-text-secondary">
      <span className="relative flex h-5 w-5 items-center justify-center">
        <span className="absolute h-2 w-2 rounded-full bg-theme-text-secondary opacity-20 motion-safe:animate-ping" />
        <span className="relative h-1.5 w-1.5 rounded-full bg-theme-text-secondary" />
      </span>
      <span className="opensin-shimmer-text">Denkt nach</span>
    </div>
  );
}
