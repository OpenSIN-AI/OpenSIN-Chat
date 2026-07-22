// SPDX-License-Identifier: MIT

import type { AgentRun, ToolCall } from "@/components/WorkspaceChat/ChatContainer/AgentSessionsSidebar/AgentRunsContext";
import { presentTool, toolTitle } from "./tool-presenter";
import { describeToolArgs } from "./tool-description";
import type { ActivityItem, ActivityStatus } from "./types";

function mapStatus(status: string): ActivityStatus {
  switch (status) {
    case "waiting_input": return "waiting";
    case "done": return "done";
    case "error": return "error";
    case "cancelled": return "cancelled";
    case "queued": return "queued";
    case "running":
    default: return "running";
  }
}

function toolToActivity(tool: ToolCall): ActivityItem {
  const presentation = presentTool(tool.name);
  return {
    id: tool.id,
    kind: presentation.kind,
    status: mapStatus(tool.status),
    title: toolTitle(tool.name, tool.status),
    description: describeToolArgs(tool.args),
    startedAt: tool.startedAt,
    endedAt: tool.endedAt,
    detail: tool.args,
    output: tool.output,
  };
}

export function runToActivity(run: AgentRun): ActivityItem {
  return {
    id: run.runId,
    kind: "agent",
    status: mapStatus(run.status),
    title:
      run.status === "done"
        ? "Aufgabe abgeschlossen"
        : run.status === "error"
          ? "Aufgabe fehlgeschlagen"
          : run.status === "waiting_input"
            ? "Benötigt eine Bestätigung"
            : "Arbeitet an der Anfrage",
    description:
      run.agentName && run.agentName !== "Agent"
        ? run.agentName
        : undefined,
    startedAt: run.startedAt,
    endedAt: run.endedAt,
    children: [
      ...run.toolCalls.map(toolToActivity),
      ...(run.children || []).map(runToActivity),
    ],
  };
}

export function runsToActivities(runs: AgentRun[]): ActivityItem[] {
  return runs.map(runToActivity);
}
