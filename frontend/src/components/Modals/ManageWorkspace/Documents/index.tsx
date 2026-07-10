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

export default function DocumentSettings({ workspace }) {
  const [highlightWorkspace, setHighlightWorkspace] = useState(false);
  const [availableDocs, setAvailableDocs] = useState({ items: [] });
  const [loading, setLoading] = useState(true);
  const [workspaceDocs, setWorkspaceDocs] = useState({ items: [] });
  const [selectedItems, setSelectedItems] = useState<any>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [movedItems, setMovedItems] = useState<any[]>([]);
  const [loadingMessage, setLoadingMessage] = useState("");
  const prevDocsRef = useRef<any>(null);
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
      currentWorkspace.documents.map((doc) => doc.docpath) || [];

    // Documents that are not in the workspace
    const filteredAvailableDocs = {
      ...localFiles,
      items: localFiles.items.map((folder) => {
        if (folder.items && folder.type === "folder") {
          return {
            ...folder,
            items: folder.items.filter(
              (file) =>
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
      ...localFiles,
      items: localFiles.items.map((folder) => {
        if (folder.items && folder.type === "folder") {
          return {
            ...folder,
            items: folder.items.filter(
              (file) =>
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
      prevDocsRef.current = localFiles;
      return;
    }

    const previousIds = new Set();
    for (const folder of prevDocsRef.current.items || []) {
      for (const file of folder.items || []) {
        if (file?.id) previousIds.add(file.id);
      }
    }

    const newSelected = {};
    for (const folder of localFiles.items || []) {
      for (const file of folder.items || []) {
        if (file?.id && !previousIds.has(file.id)) {
          newSelected[file.id] = true;
        }
      }
    }
    if (Object.keys(newSelected).length > 0) {
      setSelectedItems((prev) => ({ ...prev, ...newSelected }));
    }

    setAutoSelectNew(false);
    prevDocsRef.current = localFiles;
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

  const updateWorkspace = async (e) => {
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

    const newMovedItems = [];

    for (const itemId of Object.keys(selectedItems)) {
      for (const folder of availableDocs.items) {
        const foundItem = folder.items.find((file) => file.id === itemId);
        if (foundItem) {
          newMovedItems.push({ ...foundItem, folderName: folder.name });
          break;
        }
      }
    }

    setMovedItems([...movedItems, ...newMovedItems]);

    const newAvailableDocs = JSON.parse(JSON.stringify(availableDocs));
    const newWorkspaceDocs = JSON.parse(JSON.stringify(workspaceDocs));

    for (const itemId of Object.keys(selectedItems)) {
      let foundItem = null;
      let foundFolderIndex = null;

      newAvailableDocs.items = newAvailableDocs.items.map(
        (folder, folderIndex) => {
          const remainingItems = folder.items.filter((file) => {
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

      if (foundItem) {
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
    <div className="flex upload-modal -mt-6 z-10 relative">
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
      <div className="upload-modal-arrow">
        <ArrowsDownUp className="text-theme-text-primary text-base font-bold rotate-90 w-11 h-11" />
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
