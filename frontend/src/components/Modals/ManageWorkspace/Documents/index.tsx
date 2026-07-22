// SPDX-License-Identifier: MIT
import { ArrowsDownUp } from "@phosphor-icons/react/dist/csr/ArrowsDownUp";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Workspace from "../../../../models/workspace";
import showToast from "../../../../utils/toast";
import Directory from "./Directory";
import WorkspaceDirectory from "./WorkspaceDirectory";
import { useWorkspaceEmbeddingProgress } from "@/EmbeddingProgressContext";
import useDocuments from "@/hooks/useDocuments";
import useWorkspaceBySlug from "@/hooks/useWorkspaceBySlug";

interface DocumentFile {
  id: string;
  name: string;
  title: string;
  type: string;
  url?: string;
  published?: string | number;
  canWatch?: boolean;
  watched?: boolean;
  [key: string]: unknown;
}

interface DocumentFolder {
  name: string;
  type: string;
  items: DocumentFile[];
  [key: string]: unknown;
}

interface DocsResponse {
  items: DocumentFolder[];
  [key: string]: unknown;
}

interface DocumentSettingsProps {
  workspace: {
    slug: string;
    name?: string;
    documents?: { docpath: string }[];
    [key: string]: unknown;
  };
}

export default function DocumentSettings({ workspace }: DocumentSettingsProps) {
  const [highlightWorkspace, setHighlightWorkspace] = useState(false);
  const [availableDocs, setAvailableDocs] = useState<DocsResponse>({ items: [] });
  const [loading, setLoading] = useState(true);
  const [workspaceDocs, setWorkspaceDocs] = useState<DocsResponse>({ items: [] });
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [movedItems, setMovedItems] = useState<(DocumentFile & { folderName: string })[]>([]);
  const [loadingMessage, setLoadingMessage] = useState("");
  const prevDocsRef = useRef<DocsResponse | null>(null);
  const [autoSelectNew, setAutoSelectNew] = useState(false);

  const {
    documents: localFiles,
    isLoading: docsLoading,
    mutate: mutateDocuments,
  } = useDocuments();
  const {
    workspace: currentWorkspace,
    isLoading: wsLoading,
    mutate: mutateWorkspace,
  } = useWorkspaceBySlug(workspace.slug);

  // Sync SWR data into local state with filtering
  useEffect(() => {
    if (!localFiles || !currentWorkspace) return;

    const documentsInWorkspace =
      currentWorkspace.documents.map((doc: { docpath: string }) => doc.docpath) || [];

    const files = localFiles as { items: any[] };

    // Documents that are not in the workspace
    const filteredAvailableDocs = {
      ...files,
      items: files.items.map((folder: DocumentFolder) => {
        if (folder.items && folder.type === "folder") {
          return {
            ...folder,
            items: folder.items.filter(
              (file: DocumentFile) =>
                file.type === "file" &&
                !documentsInWorkspace.includes(`${folder.name}/${file.name}`),
            ),
          };
        } else {
          return folder;
        }
      }),
    };

    // Documents that are already in the workspace
    const filteredWorkspaceDocs = {
      ...files,
      items: files.items.map((folder: DocumentFolder) => {
        if (folder.items && folder.type === "folder") {
          return {
            ...folder,
            items: folder.items.filter(
              (file: DocumentFile) =>
                file.type === "file" &&
                documentsInWorkspace.includes(`${folder.name}/${file.name}`),
            ),
          };
        } else {
          return folder;
        }
      }),
    };

    setAvailableDocs(filteredAvailableDocs);
    setWorkspaceDocs(filteredWorkspaceDocs);
    setLoading(false);
  }, [localFiles, currentWorkspace]);

  // autoSelectNew logic: when new files appear after an upload, auto-select them
  useEffect(() => {
    if (!autoSelectNew || !localFiles || !prevDocsRef.current) {
      prevDocsRef.current = localFiles as DocsResponse | null;
      return;
    }

    const previousIds = new Set();
    for (const folder of prevDocsRef.current.items || []) {
      for (const file of folder.items || []) {
        if (file?.id) previousIds.add(file.id);
      }
    }

    const newSelected: Record<string, boolean> = {};
    const lf = localFiles as { items?: DocumentFolder[] };
    for (const folder of lf.items || []) {
      for (const file of folder.items || []) {
        if (file?.id && !previousIds.has(file.id)) {
          newSelected[file.id] = true;
        }
      }
    }
    if (Object.keys(newSelected).length > 0) {
      setSelectedItems((prev: Record<string, boolean>) => ({ ...prev, ...newSelected }));
    }

    setAutoSelectNew(false);
    prevDocsRef.current = localFiles as DocsResponse | null;
  }, [localFiles, autoSelectNew]);

  const { embeddingProgress, startEmbedding } = useWorkspaceEmbeddingProgress(
    workspace.slug,
    {
      onProgressCleared: () => {
        mutateDocuments();
        mutateWorkspace();
      },
    },
  );

  const fetchKeys = useCallback(
    async (refetchWorkspace = false, options: any = {}) => {
      const { autoSelectNew: shouldAutoSelect = false } = options;
      if (shouldAutoSelect) setAutoSelectNew(true);
      const promises = [mutateDocuments()];
      if (refetchWorkspace) promises.push(mutateWorkspace());
      await Promise.all(promises);
    },
    [mutateDocuments, mutateWorkspace],
  );

  const updateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoadingMessage("This may take a while for large documents");

    const filenames = movedItems.map(
      (item) => `${item.folderName}/${item.name}`,
    );
    const changesToSend = { adds: filenames };

    setSelectedItems({});
    setHasChanges(false);
    setHighlightWorkspace(false);

    // Fire the embed POST first so the server is already processing the job
    // by the time the SSE connection opens. This avoids the server sending
    // idle (no active job) before embedding has started.
    const embedPromise = Workspace.modifyEmbeddings(
      workspace.slug,
      changesToSend,
    );
    startEmbedding(workspace.slug, filenames);

    embedPromise.catch((error) => {
      showToast(`Workspace update failed: ${error}`, "error", {
        clear: true,
      });
    });

    setLoading(false);
    setLoadingMessage("");
    setMovedItems([]);
  };

  const moveSelectedItemsToWorkspace = () => {
    setHighlightWorkspace(false);
    setHasChanges(true);

    const newMovedItems: (DocumentFile & { folderName: string })[] = [];

    for (const itemId of Object.keys(selectedItems)) {
      for (const folder of availableDocs.items) {
        const foundItem = folder.items.find((file: DocumentFile) => file.id === itemId);
        if (foundItem) {
          newMovedItems.push({ ...foundItem, folderName: folder.name });
          break;
        }
      }
    }

    setMovedItems([...movedItems, ...newMovedItems]);

    const newAvailableDocs: DocsResponse = JSON.parse(JSON.stringify(availableDocs));
    const newWorkspaceDocs: DocsResponse = JSON.parse(JSON.stringify(workspaceDocs));

    for (const itemId of Object.keys(selectedItems)) {
      let foundItem: DocumentFile | null = null;
      let foundFolderIndex: number | null = null;

      newAvailableDocs.items = newAvailableDocs.items.map(
        (folder: DocumentFolder, folderIndex: number) => {
          const remainingItems = folder.items.filter((file: DocumentFile) => {
            const match = file.id === itemId;
            if (match) {
              foundItem = { ...file };
              foundFolderIndex = folderIndex;
            }
            return !match;
          });

          return {
            ...folder,
            items: remainingItems,
          };
        },
      );

      if (foundItem && foundFolderIndex !== null) {
        newWorkspaceDocs.items[foundFolderIndex].items.push(foundItem);
      }
    }

    setAvailableDocs(newAvailableDocs);
    setWorkspaceDocs(newWorkspaceDocs);
    setSelectedItems({});
  };

  const visibleAvailableDocs = useMemo(() => {
    const embeddingFilenames = new Set(Object.keys(embeddingProgress ?? {}));
    if (embeddingFilenames.size === 0) return availableDocs;
    return {
      ...availableDocs,
      items: (availableDocs.items ?? []).map((folder) => {
        if (folder.items && folder.type === "folder") {
          return {
            ...folder,
            items: folder.items.filter(
              (file) => !embeddingFilenames.has(`${folder.name}/${file.name}`),
            ),
          };
        }
        return folder;
      }),
    };
  }, [availableDocs, embeddingProgress]);

  return (
    <div className="upload-modal relative z-10 flex min-w-0 flex-col items-stretch gap-3 lg:flex-row lg:items-stretch">
      <Directory
        {...({
          files: visibleAvailableDocs,
          setFiles: setAvailableDocs,
          loading: loading || docsLoading || wsLoading,
          loadingMessage: loadingMessage,
          setLoading: setLoading,
          workspace: workspace,
          fetchKeys: fetchKeys,
          selectedItems: selectedItems,
          setSelectedItems: setSelectedItems,
          updateWorkspace: updateWorkspace,
          highlightWorkspace: highlightWorkspace,
          setHighlightWorkspace: setHighlightWorkspace,
          moveToWorkspace: moveSelectedItemsToWorkspace,
          setLoadingMessage: setLoadingMessage,
        } as any)}
      />
      <div className="flex shrink-0 items-center justify-center py-1 lg:px-1 lg:py-0">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-theme-bg-secondary text-theme-text-secondary">
          <ArrowsDownUp className="h-5 w-5 lg:rotate-90" />
        </span>
      </div>
      <WorkspaceDirectory
        workspace={workspace}
        files={workspaceDocs}
        highlightWorkspace={highlightWorkspace}
        loading={loading || docsLoading || wsLoading}
        loadingMessage={loadingMessage}
        setLoadingMessage={setLoadingMessage}
        setLoading={setLoading}
        hasChanges={hasChanges}
        saveChanges={updateWorkspace}
        movedItems={movedItems}
      />
    </div>
  );
}
