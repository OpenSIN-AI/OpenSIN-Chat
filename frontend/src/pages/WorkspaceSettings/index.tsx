// SPDX-License-Identifier: MIT
// Docs: index.doc.md
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import PasswordModal, { usePasswordModal } from "@/components/Modals/Password";
import { isMobile } from "react-device-detect";
import { FullScreenLoader } from "@/components/Preloader";
import {
  ArrowUUpLeft,
  ChatText,
  Database,
  Robot,
  User,
  Wrench,
} from "@phosphor-icons/react";
import paths from "@/utils/paths";
import { Link, NavLink } from "react-router-dom";
import GeneralAppearance from "./GeneralAppearance";
import ChatSettings from "./ChatSettings";
import VectorDatabase from "./VectorDatabase";
import Members from "./Members";
import WorkspaceAgentConfiguration from "./AgentConfig";
import useUser from "@/hooks/useUser";
import { useTranslation } from "react-i18next";
import useWorkspaceChats from "@/hooks/useWorkspaceChats";
import useSystemSettings from "@/hooks/useSystemSettings";

const TABS: Record<string, React.ComponentType<any>> = {
  "general-appearance": GeneralAppearance,
  "chat-settings": ChatSettings,
  "vector-database": VectorDatabase,
  members: Members,
  "agent-config": WorkspaceAgentConfiguration,
};

export default function WorkspaceSettings(): JSX.Element | null {
  const { loading, requiresAuth, mode } = usePasswordModal();

  if (loading) return <FullScreenLoader />;
  if (requiresAuth !== false) {
    return <>{requiresAuth !== null && <PasswordModal mode={mode} />}</>;
  }

  return <ShowWorkspaceChat />;
}

function ShowWorkspaceChat(): JSX.Element | null {
  const { t } = useTranslation();
  const { slug, tab } = useParams() as { slug: string; tab: string };
  const { user } = useUser();
  const {
    workspace: rawWorkspace,
    suggestedMessages,
    isLoading: workspaceLoading,
  } = useWorkspaceChats(slug);
  const { settings: systemSettings, loading: settingsLoading } =
    useSystemSettings();
  const [workspace, setWorkspace] = useState<any>(null);
  const [deletionProtected, setDeletionProtected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (workspaceLoading || settingsLoading) return;
    if (!slug) {
      setLoading(false);
      return;
    }
    if (!rawWorkspace) {
      setLoading(false);
      return;
    }

    setWorkspace({
      ...rawWorkspace,
      vectorDB: systemSettings?.VectorDB,
      suggestedMessages,
    });
    setDeletionProtected(systemSettings?.WorkspaceDeletionProtection === true);
    setLoading(false);
  }, [
    slug,
    tab,
    workspaceLoading,
    settingsLoading,
    rawWorkspace,
    suggestedMessages,
    systemSettings,
  ]);

  if (loading) return <FullScreenLoader />;

  const TabContent = TABS[tab];
  return (
    <div className="w-screen h-screen overflow-hidden bg-zinc-950 light:bg-slate-50 flex">
      {!isMobile && <Sidebar />}
      <div
        style={{ "--content-height": isMobile ? "100%" : "calc(100% - 32px)" }}
        className="h-[var(--content-height)] transition-all duration-500 relative md:ml-[2px] md:mr-[16px] md:my-[16px] md:rounded-[16px] bg-theme-bg-secondary w-full overflow-y-scroll"
      >
        <div className="flex gap-x-10 pt-6 pb-4 ml-16 mr-8 border-b-2 border-white light:border-theme-chat-input-border border-opacity-10">
          <Link
            to={paths.workspace.chat(slug)}
            className="absolute top-2 left-2 md:top-4 md:left-4 transition-all duration-300 p-2 rounded-full text-white bg-theme-sidebar-footer-icon hover:bg-theme-sidebar-footer-icon-hover z-10"
          >
            <ArrowUUpLeft className="h-5 w-5" weight="fill" />
          </Link>
          <TabItem
            title={t("workspaces—settings.general")}
            icon={<Wrench className="h-6 w-6" />}
            to={paths.workspace.settings.generalAppearance(slug)}
          />
          <TabItem
            title={t("workspaces—settings.chat")}
            icon={<ChatText className="h-6 w-6" />}
            to={paths.workspace.settings.chatSettings(slug)}
          />
          <TabItem
            title={t("workspaces—settings.vector")}
            icon={<Database className="h-6 w-6" />}
            to={paths.workspace.settings.vectorDatabase(slug)}
          />
          <TabItem
            title={t("workspaces—settings.members")}
            icon={<User className="h-6 w-6" />}
            to={paths.workspace.settings.members(slug)}
            visible={["admin", "manager"].includes(user?.role)}
          />
          <TabItem
            title={t("workspaces—settings.agent")}
            icon={<Robot className="h-6 w-6" />}
            to={paths.workspace.settings.agentConfig(slug)}
          />
        </div>
        <div className="px-16 py-6">
          <TabContent
            slug={slug}
            workspace={workspace}
            deletionProtected={deletionProtected}
          />
        </div>
      </div>
    </div>
  );
}

type TabItemProps = {
  title: string;
  icon: React.ReactNode;
  to: string;
  visible?: boolean;
};

function TabItem({ title, icon, to, visible = true }: TabItemProps): JSX.Element | null {
  if (!visible) return null;
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `${
          isActive
            ? "text-sky-400 pb-4 border-b-[4px] -mb-[19px] border-sky-400"
            : "text-white/60 hover:text-sky-400"
        } ` + " flex gap-x-2 items-center font-medium"
      }
    >
      {icon}
      <div>{title}</div>
    </NavLink>
  );
}