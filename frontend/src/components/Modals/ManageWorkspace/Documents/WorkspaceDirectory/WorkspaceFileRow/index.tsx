// SPDX-License-Identifier: MIT
import { memo, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  formatDateTimeAsMoment,
  getFileExtension,
  middleTruncate,
} from "@/utils/directories";
import { ArrowUUpLeft } from "@phosphor-icons/react/dist/csr/ArrowUUpLeft";
import { Eye } from "@phosphor-icons/react/dist/csr/Eye";
import { File } from "@phosphor-icons/react/dist/csr/File";
import { PushPin } from "@phosphor-icons/react/dist/csr/PushPin";
import { Sparkle } from "@phosphor-icons/react/dist/csr/Sparkle";
import Workspace from "@/models/workspace";
import ContextModeSelector from "./ContextModeSelector";
import DocumentInsightsModal from "@/components/Modals/DocumentInsights";
import showToast from "@/utils/toast";
import System from "@/models/system";
import logger from "@/utils/logger";

export default function WorkspaceFileRow({
  item,
  folderName,
  workspace,
  setLoading,
  setLoadingMessage,
  refresh,
  hasChanges,
  movedItems,
  selected,
  toggleSelection,
  disableSelection,
  setSelectedItems,
}) {
  const { t } = useTranslation();
  const [showInsights, setShowInsights] = useState(false);

  const onRemoveClick = async (e) => {
    e.stopPropagation();
    setLoading(true);

    try {
      setLoadingMessage(t("workspaceFileRow.removingFile"));
      await Workspace.modifyEmbeddings(workspace.slug, {
        adds: [],
        deletes: [`${folderName}/${item.name}`],
      });
      await refresh();
    } catch (error) {
      logger.error("Failed to remove document:", error);
    }
    setSelectedItems({});
    setLoadingMessage("");
    setLoading(false);
  };

  function toggleRowSelection(e) {
    if (disableSelection) return;
    e.stopPropagation();
    toggleSelection();
  }

  function handleRowSelection(e) {
    e.stopPropagation();
    toggleSelection();
  }

  const isMovedItem = movedItems?.some((movedItem) => movedItem.id === item.id);
  return (
    <>
      {showInsights && (
        <DocumentInsightsModal
          workspace={workspace}
          docPath={`${folderName}/${item.name}`}
          docId={item.id}
          docTitle={item.title}
          closeModal={() => setShowInsights(false)}
        />
      )}
      <div
        className={`text-theme-text-primary text-xs grid grid-cols-12 py-2 pl-3.5 pr-8 h-[34px] items-center file-row ${
          !disableSelection
            ? "hover:bg-theme-file-picker-hover cursor-pointer"
            : ""
        } ${isMovedItem ? "selected light:text-white" : ""} ${
          selected ? "selected light:text-white" : ""
        }`}
        onClick={toggleRowSelection}
      >
      <div
        className="col-span-10 w-fit flex gap-x-[2px] items-center relative"
        data-tooltip-id="ws-directory-item"
        data-tooltip-content={JSON.stringify({
          title: item.title,
          date: formatDateTimeAsMoment(item?.published),
          extension: getFileExtension(item.url),
        })}
      >
        <div className="shrink-0 w-3 h-3">
          {!disableSelection ? (
            <div
              className={`shrink-0 w-3 h-3 rounded border-[1px] border-solid border-white ${
                selected ? "text-white" : "text-theme-text-primary light:invert"
              } flex justify-center items-center cursor-pointer`}
              role="checkbox"
              aria-checked={selected}
              tabIndex={0}
              onClick={handleRowSelection}
            >
              {selected && <div className="w-2 h-2 bg-white rounded-[2px]" />}
            </div>
          ) : null}
        </div>
        <File
          className="shrink-0 text-base font-bold w-4 h-4 mr-[3px] ml-1"
          weight="fill"
        />
        <p className="whitespace-nowrap overflow-hidden text-ellipsis max-w-[400px]">
          {middleTruncate(item.title, 50)}
        </p>
      </div>
      <div className="col-span-2 flex justify-end items-center">
        {hasChanges ? (
          <div className="w-4 h-4 ml-2 flex-shrink-0" />
        ) : (
          <div className="flex gap-x-2 items-center">
            <WatchForChanges
              workspace={workspace}
              docPath={`${folderName}/${item.name}`}
              item={item}
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowInsights(true);
              }}
              aria-label="Show Insights"
              data-tooltip-id="pin-document"
              data-tooltip-content="Transformations & Insights"
              className="flex items-center text-theme-text-secondary hover:text-theme-text-primary transition-colors ml-2"
            >
              <Sparkle size={16} weight="regular" aria-hidden="true" />
            </button>
            <ContextModeSelector
              workspace={workspace}
              docId={item.id}
              item={item}
            />
            <RemoveItemFromWorkspace item={item} onClick={onRemoveClick} />
          </div>
        )}
      </div>
    </div>
    </>
  );
}

const PinItemToWorkspace = memo(function PinItemToWorkspace({
  workspace,
  docPath,
  item,
}: {
  workspace: any;
  docPath: string;
  item: any;
}) {
  const { t } = useTranslation();
  const [pinned, setPinned] = useState(
    item?.pinnedWorkspaces?.includes(workspace.id) || false,
  );
  // Reuse a single CustomEvent instance across renders instead of allocating
  // a new one on every render. The event is stateless and only dispatched.
  const pinEventRef = useRef(null);
  if (pinEventRef.current === null) {
    pinEventRef.current = new CustomEvent("pinned_document");
  }
  const pinEvent = pinEventRef.current;

  const updatePinStatus = async (e) => {
    try {
      e.stopPropagation();
      if (!pinned) window.dispatchEvent(pinEvent);
      const success = await Workspace.setPinForDocument(
        workspace.slug,
        docPath,
        !pinned,
      );

      if (!success) {
        showToast(t("workspaceFileRow.failedToPin"), "error", {
          clear: true,
        });
        return;
      }

      showToast(
        !pinned
          ? t("workspaceFileRow.documentPinned")
          : t("workspaceFileRow.documentUnpinned"),
        "success",
        { clear: true },
      );
      setPinned(!pinned);
    } catch (error) {
      showToast(
        `${t("workspaceFileRow.failedToPin")} ${error.message}`,
        "error",
        {
          clear: true,
        },
      );
      return;
    }
  };

  if (!item) return <div className="w-[16px] p-[2px] ml-2" />;

  return (
    <div
      onClick={updatePinStatus}
      className="group flex items-center ml-2 cursor-pointer"
      data-tooltip-id="pin-document"
      data-tooltip-content={
        pinned
          ? t("workspaceFileRow.unpinFromWorkspace")
          : t("workspaceFileRow.pinToWorkspace")
      }
    >
      {pinned ? (
        <div className="bg-theme-settings-input-active group-hover:bg-red-500/20 rounded-3xl whitespace-nowrap">
          <p className="text-xs px-2 py-0.5 group-hover:text-red-500">
            <span className="group-hover:hidden">
              {t("workspaceFileRow.pinned")}
            </span>
            <span className="hidden group-hover:inline">
              {t("workspaceFileRow.unpin")}
            </span>
          </p>
        </div>
      ) : (
        <PushPin
          size={16}
          weight="regular"
          className="outline-none text-base font-bold flex-shrink-0"
          aria-hidden="true"
        />
      )}
    </div>
  );
});

const WatchForChanges = memo(function WatchForChanges({
  workspace,
  docPath,
  item,
}: {
  workspace: any;
  docPath: string;
  item: any;
}) {
  const [watched, setWatched] = useState(item?.watched || false);
  // Reuse a single CustomEvent instance across renders instead of allocating
  // a new one on every render. The event is stateless and only dispatched.
  const watchEventRef = useRef(null);
  if (watchEventRef.current === null) {
    watchEventRef.current = new CustomEvent("watch_document_for_changes");
  }
  const watchEvent = watchEventRef.current;

  const updateWatchStatus = async (e) => {
    try {
      e.stopPropagation();
      if (!watched) window.dispatchEvent(watchEvent);
      const success =
        await System.experimentalFeatures.liveSync.setWatchStatusForDocument(
          workspace.slug,
          docPath,
          !watched,
        );

      if (!success) {
        showToast(t("workspaceFileRow.failedToWatch"), "error", {
          clear: true,
        });
        return;
      }

      showToast(
        !watched
          ? t("workspaceFileRow.documentWatched")
          : t("workspaceFileRow.documentUnwatched"),
        "success",
        { clear: true },
      );
      setWatched(!watched);
    } catch (error) {
      showToast(
        `${t("workspaceFileRow.failedToWatch")} ${error.message}`,
        "error",
        {
          clear: true,
        },
      );
      return;
    }
  };

  if (!item || !item.canWatch) return <div className="w-[16px] p-[2px] ml-2" />;

  return (
    <div
      className="group flex gap-x-2 items-center hover:bg-theme-file-picker-hover p-[2px] rounded ml-2 cursor-pointer"
      onClick={updateWatchStatus}
      data-tooltip-id="watch-changes"
      data-active={watched}
      data-tooltip-content={
        watched
          ? t("workspaceFileRow.stopWatching")
          : t("workspaceFileRow.watchForChanges")
      }
    >
      <Eye
        size={16}
        weight="regular"
        className="outline-none text-base font-bold flex-shrink-0 group-hover:hidden group-data-[active=true]:hidden"
        aria-hidden="true"
      />
      <Eye
        size={16}
        weight="fill"
        className="outline-none text-base font-bold flex-shrink-0 hidden group-hover:block group-data-[active=true]:block"
        aria-hidden="true"
      />
    </div>
  );
});

const RemoveItemFromWorkspace = ({ item: _item, onClick }) => {
  const { t } = useTranslation();
  return (
    <div>
      <ArrowUUpLeft
        aria-hidden="true"
        data-tooltip-id="remove-document"
        data-tooltip-content={t("workspaceFileRow.removeDocument")}
        onClick={onClick}
        className="text-base font-bold w-4 h-4 ml-2 flex-shrink-0 cursor-pointer"
      />
    </div>
  );
};
