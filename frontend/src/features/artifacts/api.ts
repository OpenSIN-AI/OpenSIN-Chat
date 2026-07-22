// SPDX-License-Identifier: MIT

import { API_BASE } from "@/utils/constants";
import { baseHeaders } from "@/utils/request";
import type { Artifact, ArtifactListResponse, ArtifactType } from "./types";

export async function listArtifacts(
  workspaceSlug: string,
  opts?: {
    type?: ArtifactType;
    threadId?: number;
    chatId?: number;
    limit?: number;
    offset?: number;
  },
): Promise<ArtifactListResponse> {
  const params = new URLSearchParams();
  if (opts?.type) params.set("type", opts.type);
  if (opts?.threadId) params.set("threadId", String(opts.threadId));
  if (opts?.chatId) params.set("chatId", String(opts.chatId));
  if (opts?.limit) params.set("limit", String(opts.limit));
  if (opts?.offset) params.set("offset", String(opts.offset));

  const qs = params.toString();
  const url = `${API_BASE}/workspaces/${workspaceSlug}/artifacts${qs ? `?${qs}` : ""}`;
  const res = await fetch(url, { headers: baseHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to list artifacts");
  return data;
}

export async function getArtifact(
  workspaceSlug: string,
  uuid: string,
): Promise<Artifact> {
  const res = await fetch(
    `${API_BASE}/workspaces/${workspaceSlug}/artifacts/${uuid}`,
    { headers: baseHeaders() },
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to get artifact");
  return data.artifact;
}

export async function updateArtifact(
  workspaceSlug: string,
  uuid: string,
  patch: { title?: string; description?: string; status?: string },
): Promise<Artifact> {
  const res = await fetch(
    `${API_BASE}/workspaces/${workspaceSlug}/artifacts/${uuid}`,
    {
      method: "PATCH",
      headers: { ...baseHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    },
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to update artifact");
  return data.artifact;
}

export async function deleteArtifact(
  workspaceSlug: string,
  uuid: string,
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/workspaces/${workspaceSlug}/artifacts/${uuid}`,
    { method: "DELETE", headers: baseHeaders() },
  );
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data?.error || "Failed to delete artifact");
  }
}

export function artifactDownloadUrl(
  workspaceSlug: string,
  uuid: string,
): string {
  return `${API_BASE}/workspaces/${workspaceSlug}/artifacts/${uuid}/download`;
}
