// SPDX-License-Identifier: MIT
import { API_BASE } from "@/utils/constants";
import { baseHeaders } from "@/utils/request";
import logger from "@/utils/logger";

export type Transformation = {
  id: number;
  name: string;
  title: string;
  description: string | null;
  prompt: string;
  applyDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DocumentInsight = {
  id: number;
  docId: string;
  workspaceId: number;
  transformationId: number;
  title: string;
  content: string;
  createdAt: string;
  transformation?: Pick<Transformation, "name" | "title">;
};

async function safeJson<T>(res: Response): Promise<T> {
  try {
    return await res.json();
  } catch {
    return {} as T;
  }
}

const Transformations = {
  /** Fetch all transformations (seeds defaults on first call). */
  all: async (): Promise<Transformation[]> => {
    return fetch(`${API_BASE}/transformations`, {
      method: "GET",
      headers: baseHeaders(),
    })
      .then((res) => safeJson<{ transformations: Transformation[] }>(res))
      .then((data) => data.transformations ?? [])
      .catch((e: Error) => {
        logger.error(e);
        return [];
      });
  },

  /** Create a new transformation. */
  create: async (
    data: Partial<Transformation>,
  ): Promise<Transformation | { error: string }> => {
    return fetch(`${API_BASE}/transformations`, {
      method: "POST",
      headers: { ...baseHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
      .then((res) => safeJson<{ transformation: Transformation; error?: string }>(res))
      .then((d) => d.transformation ?? (d as { error: string }))
      .catch((e: Error) => ({ error: e.message }));
  },

  /** Update an existing transformation. */
  update: async (
    id: number,
    data: Partial<Transformation>,
  ): Promise<Transformation | { error: string }> => {
    return fetch(`${API_BASE}/transformations/${id}`, {
      method: "PUT",
      headers: { ...baseHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
      .then((res) => safeJson<{ transformation: Transformation; error?: string }>(res))
      .then((d) => d.transformation ?? (d as { error: string }))
      .catch((e: Error) => ({ error: e.message }));
  },

  /** Delete a transformation by id. */
  delete: async (id: number): Promise<boolean> => {
    return fetch(`${API_BASE}/transformations/${id}`, {
      method: "DELETE",
      headers: baseHeaders(),
    })
      .then((res) => res.ok)
      .catch((e: Error) => {
        logger.error(e);
        return false;
      });
  },

  /**
   * Apply a transformation to a workspace document.
   * Returns the newly created DocumentInsight.
   */
  apply: async (
    slug: string,
    docPath: string,
    transformationId: number,
  ): Promise<{ insight?: DocumentInsight; error?: string }> => {
    return fetch(
      `${API_BASE}/workspace/${slug}/documents/apply-transformation`,
      {
        method: "POST",
        headers: { ...baseHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ docPath, transformationId }),
      },
    )
      .then((res) => safeJson<{ insight?: DocumentInsight; error?: string }>(res))
      .catch((e: Error) => ({ error: e.message }));
  },

  /** Get all insights for a document in a workspace. */
  insightsFor: async (
    slug: string,
    docId: string,
  ): Promise<DocumentInsight[]> => {
    return fetch(
      `${API_BASE}/workspace/${slug}/documents/${encodeURIComponent(docId)}/insights`,
      { method: "GET", headers: baseHeaders() },
    )
      .then((res) => safeJson<{ insights: DocumentInsight[] }>(res))
      .then((d) => d.insights ?? [])
      .catch((e: Error) => {
        logger.error(e);
        return [];
      });
  },

  /** Delete an insight. */
  deleteInsight: async (slug: string, id: number): Promise<boolean> => {
    return fetch(`${API_BASE}/workspace/${slug}/insights/${id}`, {
      method: "DELETE",
      headers: baseHeaders(),
    })
      .then((res) => res.ok)
      .catch((e: Error) => {
        logger.error(e);
        return false;
      });
  },
};

export default Transformations;
