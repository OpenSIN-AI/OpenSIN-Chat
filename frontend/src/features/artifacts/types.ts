// SPDX-License-Identifier: MIT

export type ArtifactType =
  | "image"
  | "audio"
  | "video"
  | "text"
  | "json"
  | "pdf"
  | "code";

export type ArtifactStatus = "ready" | "archived" | "error";

export interface Artifact {
  id: number;
  uuid: string;
  workspaceId: number;
  threadId: number | null;
  chatId: number | null;
  userId: number | null;
  turnId: string | null;
  type: ArtifactType;
  status: ArtifactStatus;
  title: string;
  description: string | null;
  mimeType: string | null;
  storagePath: string | null;
  downloadName: string | null;
  content: string | null;
  metadata: Record<string, unknown> | null;
  sourceData: Record<string, unknown> | null;
  version: number;
  parentUuid: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ArtifactListResponse {
  items: Artifact[];
  total: number;
}
