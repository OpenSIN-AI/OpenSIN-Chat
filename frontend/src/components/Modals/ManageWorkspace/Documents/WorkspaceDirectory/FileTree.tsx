import WorkspaceFileRow from "./WorkspaceFileRow";
import { RenderFileRows } from "./RenderFileRows";

interface FileTreeProps {
  files: any;
  movedItems: any[];
  selectedItems: Record<string, boolean>;
  setSelectedItems: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  toggleSelection: (item: any) => void;
  toggleSelectAll: () => void;
  removeSelectedItems: () => void;
  hasChanges: boolean;
  workspace: any;
  setLoading: (loading: boolean) => void;
  setLoadingMessage: (msg: string) => void;
  fetchKeys: (force?: boolean) => Promise<void>;
  handleSaveChanges: (e: React.MouseEvent) => void;
  embeddedDocCount: number;
  t: (key: string) => string;
  highlightWorkspace: boolean;
}

export function FileTree({
  files,
  movedItems,
  selectedItems,
  setSelectedItems,
  toggleSelection,
  toggleSelectAll,
  removeSelectedItems,
  hasChanges,
  workspace,
  setLoading,
  setLoadingMessage,
  fetchKeys,
  handleSaveChanges,
  embeddedDocCount,
  t,
  highlightWorkspace,
}: FileTreeProps) {
  const allCount = files.items.reduce(
    (sum: number, folder: any) => sum + folder.items.length,
    0,
  );
  const allSelected =
    Object.keys(selectedItems).length === allCount && allCount > 0;

  return (
    <div className="px-8">
      <div className="flex items-center justify-start w-[560px]">
        <h3 className="text-white text-base font-bold ml-5">
          {workspace.name}
        </h3>
      </div>
      <div className="relative w-[560px] h-[445px] mt-5">
        <div
          className={`absolute inset-0 rounded-2xl ${
            highlightWorkspace ? "border-4 border-cyan-300/80 z-[999]" : ""
          }`}
        />
        <div className="relative w-full h-full bg-theme-settings-input-bg rounded-2xl overflow-hidden border border-theme-modal-border">
          <div className="text-white/80 text-xs grid grid-cols-12 py-2 px-3.5 border-b border-white/20 light:border-theme-modal-border bg-theme-settings-input-bg sticky top-0 z-10">
            <div className="col-span-10 flex items-center gap-x-[4px]">
              {!hasChanges &&
              files.items.some((folder: any) => folder.items.length > 0) ? (
                <div
                  className={`shrink-0 w-3 h-3 rounded border-[1px] border-solid border-white text-theme-text-primary light:invert flex justify-center items-center cursor-pointer`}
                  role="checkbox"
                  aria-checked={allSelected}
                  tabIndex={0}
                  onClick={toggleSelectAll}
                >
                  {allSelected && (
                    <div className="w-2 h-2 bg-white rounded-[2px]" />
                  )}
                </div>
              ) : (
                <div className="shrink-0 w-3 h-3" />
              )}
              <p className="ml-[7px] text-theme-text-primary">
                {t("common.name")}
              </p>
            </div>
            {embeddedDocCount > 0 && (
              <p className="col-span-2 text-right text-theme-text-secondary pr-2">
                {t(`connectors.directory.total-documents`, {
                  count: embeddedDocCount,
                })}
              </p>
            )}
          </div>
          <div className="overflow-y-auto h-[calc(100%-40px)]">
            {files.items.some((folder: any) => folder.items.length > 0) ||
            movedItems.length > 0 ? (
              <RenderFileRows
                files={files}
                movedItems={movedItems}
                workspace={workspace}
              >
                {({ item, folder }) => (
                  <WorkspaceFileRow
                    key={item.id}
                    item={item}
                    folderName={folder.name}
                    workspace={workspace}
                    setLoading={setLoading}
                    setLoadingMessage={setLoadingMessage}
                    fetchKeys={fetchKeys}
                    hasChanges={hasChanges}
                    movedItems={movedItems}
                    selected={selectedItems[item.id]}
                    toggleSelection={() => toggleSelection(item)}
                    disableSelection={hasChanges}
                    setSelectedItems={setSelectedItems}
                  />
                )}
              </RenderFileRows>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-white text-opacity-40 text-sm font-medium">
                  {t("connectors.directory.no_docs")}
                </p>
              </div>
            )}
          </div>

          {Object.keys(selectedItems).length > 0 && !hasChanges && (
            <div className="absolute bottom-[12px] left-0 right-0 flex justify-center pointer-events-none">
              <div className="mx-auto bg-white/40 light:bg-white rounded-lg py-1 px-2 pointer-events-auto light:shadow-lg">
                <div className="flex flex-row items-center gap-x-2">
                  <button
                    onClick={toggleSelectAll}
                    className="border-none text-sm font-semibold bg-white light:bg-[#E0F2FE] h-[30px] px-2.5 rounded-lg hover:bg-neutral-800/80 hover:text-white light:text-[#026AA2] light:hover:bg-[#026AA2] light:hover:text-white"
                  >
                    {Object.keys(selectedItems).length === allCount
                      ? t("connectors.directory.deselect_all")
                      : t("connectors.directory.select_all")}
                  </button>
                  <button
                    onClick={removeSelectedItems}
                    className="border-none text-sm font-semibold bg-white light:bg-[#E0F2FE] h-[30px] px-2.5 rounded-lg hover:bg-neutral-800/80 hover:text-white light:text-[#026AA2] light:hover:bg-[#026AA2] light:hover:text-white"
                  >
                    {t("connectors.directory.remove_selected")}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
