// SPDX-License-Identifier: MIT
import { API_BASE } from "@/utils/constants";
import { baseHeaders } from "@/utils/request";

const Note: any = {
  forWorkspace: async function (slug: any) {
    return await fetch(`${API_BASE}/workspaces/${slug}/notes`, {
      method: "GET",
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .then((res) => res?.notes || [])
      .catch(() => []);
  },

  create: async function (slug: any, { content = "", pinned = false }: any) {
    return await fetch(`${API_BASE}/workspaces/${slug}/notes`, {
      method: "POST",
      headers: { ...baseHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ content, pinned }),
    })
      .then((res) => res.json())
      .then((res) => res?.note || null)
      .catch(() => null);
  },

  update: async function (slug: any, id: any, { content, pinned }: any) {
    return await fetch(`${API_BASE}/workspaces/${slug}/notes/${id}`, {
      method: "PUT",
      headers: { ...baseHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ content, pinned }),
    })
      .then((res) => res.json())
      .then((res) => res?.note || null)
      .catch(() => null);
  },

  delete: async function (slug: any, id: any) {
    return await fetch(`${API_BASE}/workspaces/${slug}/notes/${id}`, {
      method: "DELETE",
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .then((res) => res?.success || false)
      .catch(() => false);
  },

  shareNote: async function (
    slug: any,
    noteId: any,
    targetWorkspaceSlug: string,
  ) {
    return await fetch(`${API_BASE}/workspaces/${slug}/notes/${noteId}/share`, {
      method: "POST",
      headers: { ...baseHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ targetWorkspaceSlug }),
    })
      .then((res) => res.json())
      .then((res) => res?.shared || null)
      .catch(() => null);
  },

  getSharedNotes: async function (slug: any) {
    return await fetch(`${API_BASE}/workspaces/${slug}/notes/shared`, {
      method: "GET",
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .then((res) => res?.notes || [])
      .catch(() => []);
  },

  unshareNote: async function (
    slug: any,
    noteId: any,
    targetWorkspaceSlug: string,
  ) {
    return await fetch(
      `${API_BASE}/workspaces/${slug}/notes/${noteId}/share?targetWorkspaceSlug=${encodeURIComponent(targetWorkspaceSlug)}`,
      {
        method: "DELETE",
        headers: baseHeaders(),
      },
    )
      .then((res) => res.json())
      .then((res) => res?.success || false)
      .catch(() => false);
  },

  getShareableWorkspaces: async function (slug: any) {
    return await fetch(
      `${API_BASE}/workspaces/${slug}/notes/shareable-workspaces`,
      {
        method: "GET",
        headers: baseHeaders(),
      },
    )
      .then((res) => res.json())
      .then((res) => res?.workspaces || [])
      .catch(() => []);
  },
};

export default Note;
