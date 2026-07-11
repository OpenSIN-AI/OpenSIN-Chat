// SPDX-License-Identifier: MIT
import { memo, useEffect, useState } from "react";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { CloudArrowUp } from "@phosphor-icons/react/dist/csr/CloudArrowUp";
import { Database } from "@phosphor-icons/react/dist/csr/Database";
import { Files } from "@phosphor-icons/react/dist/csr/Files";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import useUser from "../../../hooks/useUser";
import useSystemSettings from "../../../hooks/useSystemSettings";
import useWorkspace from "../../../hooks/useWorkspaceBySlug";
import DocumentSettings from "./Documents";
import DataConnectors from "./DataConnectors";
import { EmbeddingProgressProvider } from "@/EmbeddingProgressContext";

const noop = () => {};

const ManageWorkspace = ({ hideModal = noop, providedSlug = null }) => {
  const { t } = useTranslation();
  const { slug } = useParams();
  const { user } = useUser();
  const { settings } = useSystemSettings();
  const { workspace } = useWorkspace(providedSlug ?? slug);
  const [selectedTab, setSelectedTab] = useState("documents");

  if (!workspace) return null;

  return (
    <div className="fixed inset-0 z-[99] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-theme-overlay"
        onClick={hideModal}
        aria-label={t("manageWorkspace.dismissDialog")}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="workspace-cloud-title"
        className="relative z-10 flex h-[94dvh] w-full min-w-0 flex-col overflow-hidden rounded-t-2xl bg-theme-bg-primary shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:h-[min(88vh,900px)] sm:max-w-7xl sm:rounded-2xl"
      >
        <header className="flex shrink-0 items-center gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-theme-bg-secondary text-theme-text-primary">
            <CloudArrowUp size={19} weight="bold" />
          </span>
          <div className="min-w-0 flex-1">
            <h2
              id="workspace-cloud-title"
              className="truncate text-base font-semibold text-theme-text-primary"
            >
              {t("sidebar.workspaceCloud", "Workspace Cloud")}
            </h2>
            <p className="truncate text-xs text-theme-text-secondary">
              {workspace.name}
            </p>
          </div>
          <button
            type="button"
            onClick={hideModal}
            aria-label={t("manageWorkspace.closeDialog")}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-theme-text-secondary transition-colors hover:bg-theme-bg-hover hover:text-theme-text-primary"
          >
            <X size={18} />
          </button>
        </header>

        {user?.role !== "default" && (
          <ModalTabSwitcher
            selectedTab={selectedTab}
            setSelectedTab={setSelectedTab}
          />
        )}

        <div className="min-h-0 min-w-0 flex-1 overflow-auto px-3 pb-4 pt-3 sm:px-6 sm:pb-6">
          {selectedTab === "documents" ? (
            <EmbeddingProgressProvider>
              <DocumentSettings workspace={workspace} />
            </EmbeddingProgressProvider>
          ) : (
            <DataConnectors
              {...({ workspace, systemSettings: settings } as any)}
            />
          )}
        </div>
      </section>
    </div>
  );
};

export default memo(ManageWorkspace);

const ModalTabSwitcher = ({ selectedTab, setSelectedTab }) => {
  const { t } = useTranslation();
  const tabs = [
    { id: "documents", label: t("connectors.manage.documents"), Icon: Files },
    {
      id: "dataConnectors",
      label: t("connectors.manage.data-connectors"),
      Icon: Database,
    },
  ];
  return (
    <div className="flex shrink-0 gap-1 px-4 sm:px-6" role="tablist">
      {tabs.map(({ id, label, Icon }) => {
        const active = selectedTab === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setSelectedTab(id)}
            className={`flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors ${active ? "bg-theme-sidebar-item-selected text-theme-sidebar-item-text-active" : "text-theme-text-secondary hover:bg-theme-bg-hover hover:text-theme-text-primary"}`}
          >
            <Icon size={16} weight={active ? "fill" : "regular"} />
            {label}
          </button>
        );
      })}
    </div>
  );
};

export function useManageWorkspaceModal() {
  const { user } = useUser();
  const [showing, setShowing] = useState(false);
  const showModal = () => user?.role !== "default" && setShowing(true);
  const hideModal = () => setShowing(false);

  useEffect(() => {
    if (!showing) return;
    const previous = document.body.style.overflow;
    const onEscape = (event) => event.key === "Escape" && setShowing(false);
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onEscape);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onEscape);
    };
  }, [showing]);

  return { showing, showModal, hideModal };
}
