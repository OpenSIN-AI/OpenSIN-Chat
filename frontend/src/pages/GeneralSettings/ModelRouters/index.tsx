// SPDX-License-Identifier: MIT
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Sidebar from "@/components/SettingsSidebar";
import { useIsMobileLayout } from "@/hooks/useIsMobileLayout";
import { CircleNotch } from "@phosphor-icons/react/dist/csr/CircleNotch";
import { PencilSimple } from "@phosphor-icons/react/dist/csr/PencilSimple";
import { X } from "@phosphor-icons/react/dist/csr/X";
import ModelRouter from "@/models/modelRouter";
import { useModal } from "@/hooks/useModal";
import showToast from "@/utils/toast";
import paths from "@/utils/paths";
import NewRouterModal from "./NewRouterModal";
import useModelRouters from "@/hooks/useModelRouters";

export default function ModelRouters() {
  const { t } = useTranslation();
  const { isOpen, openModal, closeModal } = useModal();
  const { routers, isLoading, refresh } = useModelRouters();
  const [editingRouter, setEditingRouter] = useState<any>(null);
  const isMobile = useIsMobileLayout();

  const openCreateModal = () => {
    setEditingRouter(null);
    openModal();
  };

  const openEditModal = (router: any) => {
    setEditingRouter(router);
    openModal();
  };

  const handleModalClose = () => {
    closeModal();
    setEditingRouter(null);
  };

  const removeRouter = (id: string | number) => {
    // Optimistic remove — refresh will reconcile
    refresh((prev: any[]) => prev?.filter((r) => r.id !== id) ?? [], false);
  };

  const isEmpty = !isLoading && routers.length === 0;

  if (isLoading)
    return (
      <Layout t={t}>
        <LoadingState />
      </Layout>
    );

  if (isEmpty)
    return (
      <Layout t={t}>
        <EmptyState onCreateClick={openCreateModal} t={t} />
        <NewRouterModal
          isOpen={isOpen}
          closeModal={handleModalClose}
          onSuccess={refresh}
          router={editingRouter}
        />
      </Layout>
    );

  return (
    <Layout t={t} showAction={!isEmpty} onAction={openCreateModal}>
      <RouterList
        routers={routers}
        removeRouter={removeRouter}
        openEditModal={openEditModal}
      />
      <NewRouterModal
        isOpen={isOpen}
        closeModal={handleModalClose}
        onSuccess={refresh}
        router={editingRouter}
      />
    </Layout>
  );
}

interface LayoutProps {
  t: any;
  showAction?: boolean;
  onAction?: () => void;
  children: React.ReactNode;
}

function Layout({ t, showAction, onAction, children }: LayoutProps) {
  return (
    <div className="w-screen h-screen overflow-hidden bg-zinc-950 light:bg-slate-50 flex md:mt-0 mt-6">
      <Sidebar />
      <div
        style={{ "--content-height": isMobile ? "100%" : "calc(100% - 32px)" }}
        className="h-[var(--content-height)] relative md:ml-[2px] md:mr-[16px] md:my-[16px] md:rounded-2xl bg-zinc-900 light:bg-white light:border light:border-slate-300 w-full overflow-y-scroll p-4 md:p-0"
      >
        <div className="flex flex-col w-full px-1 md:pl-6 md:pr-[50px] md:py-0 py-16">
          <div className="flex items-end justify-between pr-8 py-6 border-b border-white/20 light:border-slate-300">
            <div className="flex flex-col gap-y-2">
              <p className="text-lg font-semibold leading-7 text-theme-text-primary light:text-theme-text-primary">
                {t("model-router.title")}
              </p>
              <p className="text-xs leading-4 text-zinc-400 light:text-slate-600 max-w-[700px]">
                {t("model-router.description")}
              </p>
            </div>
            {showAction && (
              <button
                type="button"
                onClick={onAction}
                className="border-none shrink-0 flex items-center justify-center h-9 px-5 py-2.5 rounded-lg bg-slate-50 text-zinc-950 text-sm font-medium leading-5 hover:opacity-90 transition-opacity duration-200"
              >
                {t("model-router.new-router-button")}
              </button>
            )}
          </div>

          <div className="mt-8 flex flex-col">
            <div className="grid grid-cols-[2fr_2fr_1fr_1fr_88px] gap-x-4 px-4 text-sm font-semibold uppercase tracking-[1.4px] text-zinc-500 light:text-slate-500 leading-5">
              <span>{t("model-router.table.name")}</span>
              <span>{t("model-router.table.fallback")}</span>
              <span>{t("model-router.table.rules")}</span>
              <span>{t("model-router.table.workspaces")}</span>
              <span aria-hidden="true" />
            </div>
            <div className="mt-[18px] border-t border-white/20 light:border-slate-300" />
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-20">
      <CircleNotch className="h-8 w-8 text-zinc-400 animate-spin" />
    </div>
  );
}

interface RouterListProps {
  routers: any[];
  removeRouter: (id: string | number) => void;
  openEditModal: (router: any) => void;
}

function RouterList({ routers, removeRouter, openEditModal }: RouterListProps) {
  return (
    <div className="flex flex-col">
      {routers.map((router: any, idx: number) => (
        <RouterRow
          key={router.id}
          router={router}
          removeRouter={removeRouter}
          onEdit={() => openEditModal(router)}
          showDivider={idx < routers.length - 1}
        />
      ))}
    </div>
  );
}

interface EmptyStateProps {
  onCreateClick: () => void;
  t: any;
}

function EmptyState({ onCreateClick, t }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-8 py-28">
      <div className="flex flex-col items-center gap-1.5 text-center">
        <p className="text-base font-semibold leading-6 text-zinc-50 light:text-slate-900">
          {t("model-router.no-routers")}
        </p>
        <p className="text-sm font-medium leading-5 text-zinc-400 light:text-slate-500 max-w-[370px]">
          {t("model-router.empty-description")}
        </p>
      </div>
      <button
        type="button"
        onClick={onCreateClick}
        className="border-none flex items-center justify-center h-9 px-5 py-2.5 rounded-lg bg-slate-50 text-zinc-950 text-sm font-medium leading-5 hover:opacity-90 transition-opacity duration-200"
      >
        {t("model-router.new-router-button")}
      </button>
    </div>
  );
}

interface RouterRowProps {
  router: any;
  removeRouter: (id: string | number) => void;
  onEdit: () => void;
  showDivider: boolean;
}

function RouterRow({
  router,
  removeRouter,
  onEdit,
  showDivider,
}: RouterRowProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleDelete = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (
      !window.confirm(t("model-router.delete-confirm", { name: router.name }))
    )
      return;

    try {
      const { success, error } = await ModelRouter.delete(router.id);
      if (success) removeRouter(router.id);
      else showToast(t("model-router.toast-delete-failed", { error }), "error");
    } catch (e: any) {
      showToast(
        t("model-router.toast-delete-failed", {
          error: String(e?.message || e),
        }),
        "error",
      );
    }
  };

  const goToRules = () => navigate(paths.settings.modelRouterRules(router.id));

  const handleEditClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onEdit();
  };

  return (
    <>
      <div
        onClick={goToRules}
        className="group grid grid-cols-[2fr_2fr_1fr_1fr_88px] gap-x-4 items-center h-9 px-4 rounded-lg cursor-pointer hover:bg-white/5 light:hover:bg-slate-100 transition-colors"
      >
        <span className="text-sm font-medium leading-5 text-theme-text-primary light:text-theme-text-primary truncate">
          {router.name}
        </span>
        <span className="text-sm font-normal leading-5 text-zinc-400 light:text-slate-500 truncate">
          {router.fallback_provider}/{router.fallback_model}
        </span>
        <span className="text-sm font-normal leading-5 text-zinc-400 light:text-slate-500">
          {router.ruleCount || 0}
        </span>
        <span className="text-sm font-normal leading-5 text-zinc-400 light:text-slate-500">
          {router.workspaceCount || 0}
        </span>
        <div className="flex items-center justify-end gap-[14px]">
          <button
            type="button"
            onClick={handleEditClick}
            aria-label={t("model-router.edit-router.title", {
              name: router.name,
            })}
            className="border-none text-zinc-400 light:text-slate-500 hover:text-theme-text-primary light:hover:text-theme-text-primary transition-colors"
          >
            <PencilSimple size={16} weight="bold" />
          </button>
          <button
            type="button"
            onClick={handleDelete}
            aria-label={t("model-router.toast-deleted")}
            className="border-none text-zinc-400 light:text-slate-500 hover:text-red-400 light:hover:text-red-500 transition-colors"
          >
            <X size={16} weight="bold" />
          </button>
        </div>
      </div>
      {showDivider && (
        <div className="border-t border-white/10 light:border-slate-200" />
      )}
    </>
  );
}
