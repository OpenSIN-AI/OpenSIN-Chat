// SPDX-License-Identifier: MIT
import { useMemo } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import useSWRMutation from "swr/mutation";
import System from "@/models/system";
import Workspace from "@/models/workspace";

export const DOCUMENTS_KEY = "documents";
export const DOCUMENT_UPLOAD_KEY = "document-upload";

/**
 * Splits the local files list into available and workspace documents when a
 * workspaceId is provided. Mirrors the filtering logic that was previously
 * duplicated in DocumentSettings (Documents/index.tsx).
 */
function filterByWorkspace(localFiles, workspace) {
  const documentsInWorkspace =
    workspace?.documents?.map((doc) => doc.docpath) || [];

  const availableDocs = {
    ...localFiles,
    items: (localFiles.items || []).map((folder) => {
      if (folder.items && folder.type === "folder") {
        return {
          ...folder,
          items: folder.items.filter(
            (file) =>
              file.type === "file" &&
              !documentsInWorkspace.includes(`${folder.name}/${file.name}`),
          ),
        };
      }
      return folder;
    }),
  };

  const workspaceDocs = {
    ...localFiles,
    items: (localFiles.items || []).map((folder) => {
      if (folder.items && folder.type === "folder") {
        return {
          ...folder,
          items: folder.items.filter(
            (file) =>
              file.type === "file" &&
              documentsInWorkspace.includes(`${folder.name}/${file.name}`),
          ),
        };
      }
      return folder;
    }),
  };

  return {
    availableDocuments: availableDocs,
    workspaceDocuments: workspaceDocs,
  };
}

function applyDocumentTypeFilter(docs, documentType) {
  if (!documentType || !docs?.items) return docs;
  return {
    ...docs,
    items: docs.items.map((folder) => {
      if (folder.type !== "folder" || !Array.isArray(folder.items))
        return folder;
      return {
        ...folder,
        items: folder.items.filter((file) => file.type === documentType),
      };
    }),
  };
}

function applyPagination(docs, pagination) {
  if (!pagination || !docs?.items) return docs;
  const { page = 1, limit = 50 } = pagination;
  const allItems = docs.items.flatMap((folder) => folder.items || []);
  const start = (page - 1) * limit;
  const paginatedItems = allItems.slice(start, start + limit);
  return { ...docs, items: paginatedItems };
}

/**
 * Fetches all local documents with caching, request de-duplication and
 * stale-while-revalidate.
 *
 * When `workspaceId` is provided the returned shape is:
 *   {
 *     documents: {
 *       availableDocuments: <filtered list>,
 *       workspaceDocuments: <filtered list>
 *     },
 *     ...
 *   }
 *
 * Otherwise it returns the raw `System.localFiles()` shape.
 *
 * @param {string} [workspaceId] - workspace slug to split docs into available / workspace
 * @param {{ documentType?: string, pagination?: { page: number, limit: number } }} [options]
 * @returns {{
 *   documents: object | null,
 *   isLoading: boolean,
 *   error: Error | undefined,
 *   refresh: () => Promise<any>,
 *   mutate: import("swr").KeyedMutator<any>
 * }}
 */
export default function useDocuments(workspaceId, options = {}) {
  const { documentType, pagination } = options;

  const key = workspaceId
    ? [
        DOCUMENTS_KEY,
        workspaceId,
        documentType,
        pagination?.page,
        pagination?.limit,
      ]
    : DOCUMENTS_KEY;

  const { data, error, isLoading, mutate } = useSWR(
    key,
    async () => {
      const localFiles = await System.localFiles();
      if (!localFiles) return null;

      let result = localFiles;

      if (workspaceId) {
        const workspace = await Workspace.bySlug(workspaceId);
        result = filterByWorkspace(localFiles, workspace);
      }

      if (documentType) {
        if (result.availableDocuments) {
          result = {
            availableDocuments: applyDocumentTypeFilter(
              result.availableDocuments,
              documentType,
            ),
            workspaceDocuments: applyDocumentTypeFilter(
              result.workspaceDocuments,
              documentType,
            ),
          };
        } else {
          result = applyDocumentTypeFilter(result, documentType);
        }
      }

      if (pagination) {
        if (result.availableDocuments) {
          result = {
            availableDocuments: applyPagination(
              result.availableDocuments,
              pagination,
            ),
            workspaceDocuments: applyPagination(
              result.workspaceDocuments,
              pagination,
            ),
          };
        } else {
          result = applyPagination(result, pagination);
        }
      }

      return result;
    },
    { revalidateOnFocus: false },
  );

  return {
    documents: data || null,
    isLoading,
    error,
    refresh: mutate,
    mutate,
  };
}

/**
 * Looks up a single document by id from the cached local files list.
 * Falls back to fetching the list if it is not yet cached.
 *
 * @param {string} id
 * @returns {{
 *   document: object | null,
 *   isLoading: boolean,
 *   error: Error | undefined,
 *   mutate: import("swr").KeyedMutator<any>
 * }}
 */
export function useDocument(id) {
  const {
    data: allDocuments,
    error,
    isLoading,
    mutate,
  } = useSWR(id ? DOCUMENTS_KEY : null, () => System.localFiles());

  const document = useMemo(() => {
    if (!allDocuments || !id) return null;
    for (const folder of allDocuments.items || []) {
      for (const file of folder.items || []) {
        if (file.id === id) return file;
      }
    }
    return null;
  }, [allDocuments, id]);

  return { document, isLoading, error, mutate };
}

/**
 * Uploads a file via Workspace.uploadFile and automatically revalidates the
 * documents list on success.
 *
 * @returns {{
 *   upload: (arg: { slug: string, formData: FormData }) => Promise<any>,
 *   data: any,
 *   error: Error | undefined,
 *   isUploading: boolean
 * }}
 */
export function useDocumentUpload() {
  const { trigger, data, error, isMutating } = useSWRMutation(
    DOCUMENT_UPLOAD_KEY,
    async (_, { arg }) => {
      const { slug, formData } = arg;
      const result = await Workspace.uploadFile(slug, formData);
      await globalMutate(DOCUMENTS_KEY);
      return result;
    },
  );

  return { upload: trigger, data, error, isUploading: isMutating };
}
