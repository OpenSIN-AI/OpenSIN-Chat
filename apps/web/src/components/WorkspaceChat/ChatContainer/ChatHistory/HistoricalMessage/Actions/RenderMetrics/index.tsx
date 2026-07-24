// SPDX-License-Identifier: MIT
import { formatDateTimeAsMoment } from "@/utils/directories";
import React from "react";

/**
 * Build the compact timestamp shown below a chat message. Detailed model,
 * speed, and token metrics are available through `/usage` in the tools menu.
 * @param {metrics: {duration:number, outputTps: number, model?: string, timestamp?: number}} metrics
 * @returns {string}
 */
function buildMetricsString(
  metrics: {
    model?: string;
    duration?: number;
    outputTps?: number;
    timestamp?: number;
  } = {},
) {
  return metrics?.timestamp
    ? formatDateTimeAsMoment(metrics.timestamp, "MMM D, h:mm A")
    : "";
}

/**
 * Compatibility provider retained for the existing message-list composition.
 * Visibility controls were removed because only the timestamp remains in the
 * message footer; usage details are accessed through `/usage`.
 * @param {React.ReactNode} children
 * @returns {React.ReactNode}
 */
export function MetricsProvider({ children }: any) {
  return <>{children}</>;
}

/**
 * Render the metrics for a given chat, if available
 * @param {metrics: {duration:number, outputTps: number, model: string, timestamp: number}} props
 * @returns
 */
export default function RenderMetrics({ metrics = {} }: any) {
  if (!metrics?.timestamp) return null;

  // Only show timestamp on message hover/focus — keeps the footer quiet.
  return (
    <p className="text-xs font-mono text-zinc-400 light:text-slate-500 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
      {buildMetricsString(metrics)}
    </p>
  );
}
