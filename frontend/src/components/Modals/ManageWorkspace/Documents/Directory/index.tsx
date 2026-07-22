// SPDX-License-Identifier: MIT
import UploadFile from "../UploadFile";
import { memo, useMemo, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import FolderRow from "./FolderRow";
import System from "@/models/system";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { Plus } from "@phosphor-icons/react/dist/csr/Plus";
import { Trash } from "@phosphor-icons/react/dist/csr/Trash";
import Document from "@/models/document";
import showToast from "@/utils/toast";
import FolderSelectionPopup from "./FolderSelectionPopup";
import MoveToFolderIcon from "./MoveToFolderIcon";
import { useModal } from "@/hooks/useModal";
import useDocuments from "@/hooks/useDocuments";
import useWorkspaceBySlug from "@/hooks/useWorkspaceBySlug";
import useConfirm from "@/hooks/useConfirm";
import NewFolderModal from "./NewFolderModal";
import debounce from "lodash.debounce";
import { filterFileSearchResults } from "./utils";
import ToolbarButton from "@/components/ui/ToolbarButton";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Files } from "@phosphor-icons/react/dist/csr/Files";
import ContextMenu from "./ContextMenu";
import { Tooltip } from "react-tooltip";
import { safeJsonParse } from "@/utils/request";
import logger from "@/utils/logger";

interface DirectoryItem {
  id: string;
  name: string;
  type: "folder" | "file";
  items?: DirectoryItem[];
}

interface DirectoryFiles {
  items: DirectoryItem[];
}

interface DirectoryProps {
  files: DirectoryFiles;
  setFiles: React.Dispatch<React.SetStateAction<DirectoryFiles>>;
  loading: boolean;
  setLoading: (v: boolean) => void;
  workspace: { slug: string; [key: string]: any };
  fetchKeys: () => void;
  selectedItems: Record<string, boolean>;
  setSelectedItems: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setHighlightWorkspace: (v: boolean) => void;
  moveToWorkspace: () => void;
  setLoadingMessage: (v: string) => void;
  loadingMessage: string;
}

function Directory({
  files,
  setFiles,
  loading,
  setLoading,
  workspace,
  fetchKeys,
  selectedItems,
  setSelectedItems,
  setHighlightWorkspace,
  moveToWorkspace,
  setLoadingMessage,
  loadingMessage,
}: DirectoryProps) {
  const { mutate: mutateDocuments } = useDocuments();
  const { mutate: mutateWorkspace } = useWorkspaceBySlug(workspace.slug);
  const { t } = useTranslation();
  const confirm = useConfirm();
  const amountSelected = useMemo(
    () => Object.keys(selectedItems).length,
    [selectedItems],
  );
  const [showFolderSelection, setShowFolderSelection] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const {
    isOpen: isFolderModalOpen,
    openModal: openFolderModal,
    closeModal: closeFolderModal,
  } = useModal();
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
  });

  const deleteFiles = async (event: React.MouseEvent) => {
    event.stopPropagation();
    if (
      !(await confirm({
        title: t("connectors.directory.delete-confirmation"),
        confirmLabel: t("common.delete"),
        destructive: true,
      }))
    ) {
      return false;
    }

    try {
      const toRemove: string[] = [];
      const foldersToRemove: string[] = [];

      for (const itemId of Object.keys(selectedItems)) {
        for (const folder of files.items) {
          const foundItem = folder.items?.find((file: DirectoryItem) => file.id === itemId);
          if (foundItem) {
            toRemove.push(`${folder.name}/${foundItem.name}`);
            break;
          }
        }
      }
      for (const folder of files.items) {
        if (folder.name === "custom-documents") {
          continue;
        }

        if (isSelected(folder.id, folder)) {
          foldersToRemove.push(folder.name);
        }
      }

      setLoading(true);
      setLoadingMessage(
        t("connectors.directory.removing-message", {
          count: toRemove.length,
          folderCount: foldersToRemove.length,
        }),
      );
      await System.deleteDocuments(toRemove);
      for (const folderName of foldersToRemove) {
        await System.deleteFolder(folderName);
      }

      await Promise.all([mutateDocuments(), mutateWorkspace()]);
      setSelectedItems({});
    } catch (error) {
      logger.error("Failed to delete files and folders:", error);
    } finally {
      setLoading(false);
      setSelectedItems({});
    }
  };

  const toggleSelection = (item: DirectoryItem) => {
    setSelectedItems((prevSelectedItems: Record<string, boolean>) => {
      const newSelectedItems = { ...prevSelectedItems };
      if (item.type === "folder") {
        // select all files in the folder
        if (newSelectedItems[item.name]) {
          delete newSelectedItems[item.name];
          item.items?.forEach((file: DirectoryItem) => delete newSelectedItems[file.id]);
        } else {
          newSelectedItems[item.name] = true;
          item.items?.forEach((file: DirectoryItem) => (newSelectedItems[file.id] = true));
        }
      } else {
        // single file selections
        if (newSelectedItems[item.id]) {
          delete newSelectedItems[item.id];
        } else {
          newSelectedItems[item.id] = true;
        }
      }

      return newSelectedItems;
    });
  };

  // check if item is selected based on selectedItems state
  const isSelected = (id: string, item: DirectoryItem | null) => {
    if (item && item.type === "folder") {
      if (!selectedItems[item.name]) {
        return false;
      }
      return (item.items ?? []).every((file: DirectoryItem) => selectedItems[file.id]);
    }

    return !!selectedItems[id];
  };

  const moveToFolder = async (folder: DirectoryItem) => {
    const toMove: (DirectoryItem & { folderName: string })[] = [];
    for (const itemId of Object.keys(selectedItems)) {
      for (const currentFolder of files.items) {
        const foundItem = currentFolder.items?.find(
          (file: DirectoryItem) => file.id === itemId,
        );
        if (foundItem) {
          toMove.push({ ...foundItem, folderName: currentFolder.name });
          break;
        }
      }
    }
    setLoading(true);
    setLoadingMessage(`Moving ${toMove.length} documents. Please wait.`);
    let result: any;
    try {
      result = await Document.moveToFolder(toMove, folder.name);
    } catch (e: any) {
      showToast(`Error moving files: ${String(e?.message || e)}`, "error");
      setLoading(false);
      return;
    }
    const { success, message } = result;
    if (!success) {
      showToast(`Error moving files: ${message}`, "error");
      setLoading(false);
      return;
    }

    if (success && message) {
      // show info if some files were not moved due to being embedded
      showToast(message, "info");
    } else {
      showToast(
        t("connectors.directory.move-success", { count: toMove.length }),
        "success",
      );
    }
    try {
      await Promise.all([mutateDocuments(), mutateWorkspace()]);
      setSelectedItems({});
    } catch (e) {
      logger.error("Failed to refresh after move:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = useMemo(
    () =>
      debounce((e: React.ChangeEvent<HTMLInputElement>) => {
        const searchValue = e.target.value;
        setSearchTerm(searchValue);
      }, 500),
    [],
  );

  useEffect(() => {
    return () => handleSearch.cancel();
  }, [handleSearch]);

  const filteredFiles = filterFileSearchResults(files as any, searchTerm) as unknown as DirectoryItem[];

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    setContextMenu({ visible: true, x: event.clientX, y: event.clientY });
  };

  const closeContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0 });
  };

  const totalDocCount = (files?.items ?? []).reduce((acc: number, folder: DirectoryItem) => {
    if (folder.type === "folder") return (folder.items?.length ?? 0) + acc;
    return acc;
  }, 0);

  return (
    <>
      <div className="min-w-0 flex-1" onContextMenu={handleContextMenu}>
        <div className="flex min-w-0 flex-col gap-3">
          <div className="relative flex min-w-0 flex-wrap items-center gap-2 px-1 sm:px-3">
            <h3 className="text-theme-text-primary text-base font-bold">
              {t("connectors.directory.my-documents")}
            </h3>
            <div className="relative">
              <input
                type="search"
                placeholder={t("connectors.directory.search-document")}
                onChange={handleSearch}
                className="search-input h-8 w-full rounded-lg border-none bg-theme-bg-secondary py-2 pl-9 pr-2.5 text-sm text-theme-text-primary outline-none placeholder:text-theme-settings-input-placeholder focus:bg-theme-bg-hover sm:w-[220px]"
              />
              <MagnifyingGlass
                size={14}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-theme-text-primary"
                weight="bold"
                aria-hidden="true"
              />
            </div>
            <button
              type="button"
              className="border-none flex items-center gap-x-2 cursor-pointer px-[14px] py-[7px] -mr-[14px] rounded-lg hover:bg-theme-sidebar-subitem-hover z-20 relative"
              onClick={openFolderModal}
              aria-label={t("directory.createNewFolderAriaLabel")}
            >
              <Plus
                size={18}
                weight="bold"
                className="text-theme-text-primary light:text-sky-500"
              />
              <div className="text-theme-text-primary light:text-sky-500 text-xs font-bold leading-[18px]">
                {t("connectors.directory.new-folder")}
              </div>
            </button>
          </div>

          <div className="relative h-[310px] min-w-0 overflow-hidden rounded-xl bg-theme-bg-secondary">
            <div className="absolute top-0 left-0 right-0 z-10 rounded-t-2xl text-theme-text-primary text-xs grid grid-cols-12 py-2 px-8 border-b border-white/20 light:border-theme-modal-border bg-theme-settings-input-bg">
              <p className="col-span-6">{t("common.name")}</p>
              {totalDocCount > 0 && (
                <p className="col-span-6 text-right text-theme-text-secondary">
                  {t(`connectors.directory.total-documents`, {
                    count: totalDocCount,
                  })}
                </p>
              )}
            </div>

            <div className="overflow-y-auto h-full pt-8">
              {loading ? (
                <LoadingState label={loadingMessage} rows={5} />
              ) : filteredFiles.length > 0 ? (
                filteredFiles.map(
                  (item: DirectoryItem, index: number) =>
                    item.type === "folder" && (
                      <FolderRow
                        key={item.id ?? `${item.name}-${index}`}
                        item={item}
                        totalItems={item.items?.length ?? 0}
                        selected={isSelected(
                          item.id,
                          item.type === "folder" ? item : null,
                        )}
                        onRowClick={() => toggleSelection(item)}
                        toggleSelection={toggleSelection}
                        isSelected={isSelected}
                        autoExpanded={index === 0}
                      />
                    ),
                )
              ) : (
                <EmptyState
                  icon={<Files size={24} />}
                  title={t("connectors.directory.no-documents")}
                  compact
                />
              )}
            </div>
            {amountSelected !== 0 && (
              <div className="absolute bottom-[12px] left-0 right-0 flex justify-center pointer-events-none">
                <div className="mx-auto bg-white/40 light:bg-white rounded-lg py-1 px-2 pointer-events-auto light:shadow-lg">
                  <div className="flex flex-row items-center gap-x-2">
                    <ToolbarButton
                      onClick={moveToWorkspace}
                      onMouseEnter={() => setHighlightWorkspace(true)}
                      onMouseLeave={() => setHighlightWorkspace(false)}
                    >
                      {t("connectors.directory.move-workspace")}
                    </ToolbarButton>
                    <div className="relative">
                      <ToolbarButton
                        iconOnly
                        className="group"
                        onClick={() =>
                          setShowFolderSelection(!showFolderSelection)
                        }
                      >
                        <MoveToFolderIcon className="text-dark-text light:text-sky-700 group-hover:text-theme-text-primary" />
                      </ToolbarButton>
                      {showFolderSelection && (
                        <FolderSelectionPopup
                          folders={files.items.filter(
                            (item: DirectoryItem) => item.type === "folder",
                          )}
                          onSelect={moveToFolder}
                          onClose={() => setShowFolderSelection(false)}
                        />
                      )}
                    </div>
                    <ToolbarButton
                      iconOnly
                      onClick={deleteFiles}
                      aria-label={t("directory.deleteSelectedAriaLabel")}
                    >
                      <Trash size={18} weight="bold" aria-hidden="true" />
                    </ToolbarButton>
                  </div>
                </div>
              </div>
            )}
          </div>
          <UploadFile
            workspace={workspace}
            fetchKeys={fetchKeys}
            setLoading={setLoading}
            setLoadingMessage={setLoadingMessage}
          />
        </div>
        {isFolderModalOpen && (
          <div className="bg-black/60 backdrop-blur-sm fixed top-0 left-0 outline-none w-screen h-screen flex items-center justify-center z-30">
            <NewFolderModal
              closeModal={closeFolderModal}
              files={files}
              setFiles={setFiles}
            />
          </div>
        )}
        <ContextMenu
          contextMenu={contextMenu}
          closeContextMenu={closeContextMenu}
          files={files}
          selectedItems={selectedItems}
          setSelectedItems={setSelectedItems}
        />
      </div>
      <DirectoryTooltips />
    </>
  );
}

/**
 * Tooltips for the directory components. Renders when the directory is shown
 * or updated so that tooltips are attached as the items are changed.
 */
function DirectoryTooltips() {
  return (
    <Tooltip
      id="directory-item"
      place="bottom"
      delayShow={800}
      className="tooltip invert light:invert-0 z-[99] max-w-[300px]"
      render={({ content }) => {
        const data = safeJsonParse(content, null);
        if (!data) return null;
        return (
          <div className="text-xs">
            <p className="text-white light:invert font-medium break-all">
              {data.title}
            </p>
            <div className="flex flex-col mt-1">
              <p className="">
                Date: <b>{data.date}</b>
              </p>
              <p className="">
                Type: <b>{data.extension}</b>
              </p>
            </div>
          </div>
        );
      }}
    />
  );
}

export default memo(Directory);
