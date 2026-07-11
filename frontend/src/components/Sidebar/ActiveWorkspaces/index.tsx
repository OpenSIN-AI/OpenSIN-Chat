// SPDX-License-Identifier: MIT
import React, { memo, useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import Workspace from "@/models/workspace";
import ManageWorkspace, {
  useManageWorkspaceModal,
} from "../../Modals/ManageWorkspace";
import paths from "@/utils/paths";
import { Link, useParams, useNavigate, useMatch } from "react-router-dom";
import { GearSix } from "@phosphor-icons/react/dist/csr/GearSix";
import { UploadSimple } from "@phosphor-icons/react/dist/csr/UploadSimple";
import { DotsSixVertical } from "@phosphor-icons/react/dist/csr/DotsSixVertical";
import { SquaresFour } from "@phosphor-icons/react/dist/csr/SquaresFour";
import { Plus } from "@phosphor-icons/react/dist/csr/Plus";
import { ChatCircleText } from "@phosphor-icons/react/dist/csr/ChatCircleText";
import { FolderSimplePlus } from "@phosphor-icons/react/dist/csr/FolderSimplePlus";
import useUser from "@/hooks/useUser";
import useWorkspaces from "@/hooks/useWorkspaces";
import ThreadContainer from "./ThreadContainer";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import showToast from "@/utils/toast";
import { LAST_VISITED_WORKSPACE } from "@/utils/constants";
import { safeJsonParse } from "@/utils/request";
import { safeGetItem } from "@/utils/safeStorage";
import { invalidateThreads } from "@/hooks/useThreads";
import { useTranslation } from "react-i18next";

/** Small + dropdown for Workspace rows: creates a new Chat or a new Folder */
function WorkspaceQuickAdd({ workspace, isActive }: any) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target) || menuRef.current?.contains(target))
        return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const openMenu = useCallback(() => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, left: rect.right - 176 });
    }
    setOpen((p) => !p);
  }, []);

  const handleNewChat = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(false);
    if (!workspace?.slug) return;
    try {
      const { thread, error } = await Workspace.threads.new(workspace.slug);
      if (error) {
        showToast(t("activeWorkspaces.chatCreateFailed", { error }), "error", {
          clear: true,
        });
        return;
      }
      invalidateThreads(workspace.slug);
      navigate(paths.workspace.thread(workspace.slug, thread?.slug));
    } catch (e: any) {
      showToast(
        t("activeWorkspaces.chatCreateFailed", {
          error: String(e?.message || e),
        }),
        "error",
        { clear: true },
      );
    }
  };

  const handleNewFolder = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(false);
    const name = window.prompt(t("activeWorkspaces.folderNamePrompt"))?.trim();
    if (!name) return;
    try {
      const { folder, message } = await Workspace.threads.folders.new(
        workspace.slug,
        name,
      );
      if (message || !folder) {
        showToast(
          t("activeWorkspaces.folderCreateFailed", { message }),
          "error",
          { clear: true },
        );
        return;
      }
      invalidateThreads(workspace.slug);
    } catch (e: any) {
      showToast(
        t("activeWorkspaces.folderCreateFailed", {
          message: String(e?.message || e),
        }),
        "error",
        { clear: true },
      );
    }
  };

  return (
    <div ref={ref} className="relative flex items-center">
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          openMenu();
        }}
        data-tooltip-id="workspace-quick-add"
        data-tooltip-content={t("activeWorkspaces.createTooltip")}
        className="group/plus flex items-center justify-center rounded-md border-none p-1 text-theme-text-secondary transition-colors hover:bg-theme-bg-hover hover:text-theme-text-primary"
        aria-label={t("activeWorkspaces.createTooltip")}
      >
        <Plus className="h-3.5 w-3.5 transition-colors" />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: menuPos.top,
              left: menuPos.left,
              zIndex: 9999,
            }}
            className="w-44 overflow-hidden rounded-lg border border-theme-modal-border bg-theme-bg-secondary py-1 shadow-2xl"
          >
            <button
              type="button"
              onClick={handleNewChat}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs text-theme-text-secondary transition-colors hover:bg-theme-bg-hover hover:text-theme-text-primary"
            >
              <ChatCircleText size={13} />
              {t("activeWorkspaces.newChat")}
            </button>
            <div className="mx-2 h-px bg-theme-modal-border" />
            <button
              type="button"
              onClick={handleNewFolder}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs text-theme-text-secondary transition-colors hover:bg-theme-bg-hover hover:text-theme-text-primary"
            >
              <FolderSimplePlus size={13} />
              {t("activeWorkspaces.newFolder")}
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
}

function ActiveWorkspaces() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { slug } = useParams();
  const {
    workspaces,
    isLoading: loading,
    mutate: mutateWorkspaces,
  } = useWorkspaces({ ordered: true });
  const [selectedWs, setSelectedWs] = useState<any>(null);
  const { showing, showModal, hideModal } = useManageWorkspaceModal();
  const { user } = useUser();
  const isInWorkspaceSettings = !!useMatch("/workspace/:slug/settings/:tab");
  const isHomePage = !!useMatch("/");

  if (loading) {
    return (
      <Skeleton
        height={40}
        width="100%"
        count={5}
        baseColor="var(--theme-sidebar-item-default)"
        highlightColor="var(--theme-sidebar-item-hover)"
        enableAnimation={true}
        className="my-1"
      />
    );
  }

  /**
   * Reorders workspaces in the UI via localstorage on client side.
   * @param {number} startIndex - the index of the workspace to move
   * @param {number} endIndex - the index to move the workspace to
   */
  function reorderWorkspaces(startIndex: any, endIndex: any) {
    const reorderedWorkspaces = Array.from(workspaces);
    const [removed] = reorderedWorkspaces.splice(startIndex, 1);
    reorderedWorkspaces.splice(endIndex, 0, removed);
    const success = Workspace.storeWorkspaceOrder(
      (reorderedWorkspaces as any).map((w) => w.id),
    );
    if (success) {
      // Optimistically update the SWR cache with the new order without
      // triggering a revalidation; the stored preference keeps it stable.
      mutateWorkspaces(reorderedWorkspaces, { revalidate: false });
    } else {
      showToast(t("activeWorkspaces.reorderFailed"), "error");
      mutateWorkspaces();
    }
  }

  const onDragEnd: any = (result) => {
    if (!result.destination) return;
    reorderWorkspaces(result.source.index, result.destination.index);
  };

  // When on the home page, resolve which workspace should be virtually active
  const virtualActiveSlug: any = (() => {
    if (!isHomePage || workspaces.length === 0) return null;
    const lastVisited = safeJsonParse(safeGetItem(LAST_VISITED_WORKSPACE));
    if (
      lastVisited?.slug &&
      (workspaces as any).some((ws) => ws.slug === lastVisited.slug)
    )
      return lastVisited.slug;
    return workspaces[0]?.slug ?? null;
  })();

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="workspaces">
        {(provided) => (
          <div
            role="list"
            aria-label={t("sidebar.workspacesList")}
            className="flex flex-col gap-y-2"
            ref={provided.innerRef}
            {...provided.droppableProps}
          >
            {(workspaces as any).map((workspace, index) => {
              const isVirtuallyActive = workspace.slug === virtualActiveSlug;
              const isActive = workspace.slug === slug || isVirtuallyActive;
              return (
                <Draggable
                  key={workspace.id}
                  draggableId={workspace.id.toString()}
                  index={index}
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`flex flex-col w-full group ${
                        snapshot.isDragging ? "opacity-50" : ""
                      }`}
                      {...({ role: "listitem" } as any)}
                    >
                      <div className="flex gap-x-1 items-center justify-between">
                        <Link
                          to={paths.workspace.chat(workspace.slug)}
                          aria-current={isActive ? "page" : undefined}
                          className={`
                            transition-colors duration-150
                            flex flex-grow w-[75%] gap-x-2 py-1.5 pl-2 pr-1.5 rounded-md text-sm justify-start items-center
                            ${
                              isActive
                                ? "bg-theme-sidebar-item-selected text-theme-sidebar-item-text-active"
                                : "text-theme-sidebar-item-text-inactive hover:bg-theme-sidebar-item-hover hover:text-theme-text-primary"
                            }
                          `}
                        >
                          <div className="flex flex-row justify-between w-full items-center gap-x-1">
                            <div
                              {...provided.dragHandleProps}
                              className="cursor-grab opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex-shrink-0"
                            >
                              <DotsSixVertical
                                size={14}
                                weight="bold"
                                className="text-theme-placeholder"
                              />
                            </div>
                            <SquaresFour
                              size={14}
                              weight={isActive ? "fill" : "regular"}
                              className={`shrink-0 ${isActive ? "text-theme-sidebar-item-text-active" : "text-theme-placeholder"}`}
                            />
                            <div
                              data-tooltip-id="workspace-name"
                              data-tooltip-content={workspace.name}
                              className="flex items-center overflow-hidden flex-grow"
                            >
                              <p
                                className={`truncate whitespace-nowrap text-xs font-medium leading-relaxed ${isActive ? "text-theme-sidebar-item-text-active" : ""}`}
                              >
                                {workspace.name}
                              </p>
                            </div>
                            {user?.role !== "default" && (
                              <div
                                className={`flex items-center gap-x-0.5 transition-opacity duration-150 flex-shrink-0 ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                              >
                                <WorkspaceQuickAdd
                                  workspace={workspace}
                                  isActive={isActive}
                                />
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setSelectedWs(workspace);
                                    showModal();
                                  }}
                                  data-tooltip-id="upload-workspace"
                                  data-tooltip-content={t(
                                    "activeWorkspaces.uploadDocuments",
                                  )}
                                  aria-label={t(
                                    "activeWorkspaces.uploadDocuments",
                                  )}
                                  className="group/upload flex items-center justify-center rounded-md border-none p-1 text-theme-text-secondary transition-colors hover:bg-theme-bg-hover hover:text-theme-text-primary"
                                >
                                  <UploadSimple className="h-3.5 w-3.5 transition-colors" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    navigate(
                                      isInWorkspaceSettings
                                        ? paths.workspace.chat(workspace.slug)
                                        : paths.workspace.settings.generalAppearance(
                                            workspace.slug,
                                          ),
                                    );
                                  }}
                                  className="group/gear flex items-center justify-center rounded-md p-1 text-theme-text-secondary transition-colors hover:bg-theme-bg-hover hover:text-theme-text-primary"
                                  aria-label={t(
                                    "sidebar.generalAppearanceSettings",
                                  )}
                                  data-tooltip-id="gear-workspace"
                                  data-tooltip-content={t(
                                    "sidebar.generalAppearanceSettings",
                                  )}
                                >
                                  <GearSix
                                    className={`h-3.5 w-3.5 transition-colors ${
                                      isInWorkspaceSettings &&
                                      workspace.slug === slug
                                        ? "text-theme-text-primary"
                                        : ""
                                    }`}
                                  />
                                </button>
                              </div>
                            )}
                          </div>
                        </Link>
                      </div>
                      {isActive && (
                        <ThreadContainer
                          workspace={workspace}
                          isActive={isActive}
                          isVirtualThread={isVirtuallyActive}
                        />
                      )}
                    </div>
                  )}
                </Draggable>
              );
            })}
            {provided.placeholder}
            {showing && (
              <ManageWorkspace
                hideModal={hideModal}
                providedSlug={selectedWs ? selectedWs.slug : null}
              />
            )}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}

export default memo(ActiveWorkspaces);
