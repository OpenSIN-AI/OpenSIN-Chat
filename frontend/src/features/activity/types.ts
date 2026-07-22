// SPDX-License-Identifier: MIT

export type ActivityStatus = "queued" | "running" | "waiting" | "done" | "error" | "cancelled";

export type ActivityKind =
  | "thinking"
  | "web-search"
  | "source-read"
  | "file-read"
  | "repository"
  | "terminal"
  | "code-edit"
  | "browser"
  | "email"
  | "cloud"
  | "agent"
  | "generic";

export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  status: ActivityStatus;
  title: string;
  description?: string;
  startedAt?: number;
  endedAt?: number;
  detail?: unknown;
  output?: string;
  children?: ActivityItem[];
}
