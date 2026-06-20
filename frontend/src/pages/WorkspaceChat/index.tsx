// SPDX-License-Identifier: MIT
import React, { useEffect, useState } from "react";
import { default as WorkspaceChatContainer } from "@/components/WorkspaceChat";
import Sidebar from "@/components/Sidebar";
import LeftSidebarIconBar from "@/components/WorkspaceChat/ChatContainer/LeftSidebarIconBar";
import {
  SidebarToggleProvider,
  useSidebarToggle,
} from "@/components/Sidebar/SidebarToggle";
import { useParams } from "react-router-dom";
import PasswordModal, { usePasswordModal } from "@/components/Modals/Password";
import { useIsMobileLayout } from "@/hooks/useIsMobileLayout";
import { FullScreenLoader } from "@/components/Preloader";
import { LAST_VISITED_WORKSPACE } from "@/utils/constants";
import { safeSetItem } from "@/utils/safeStorage";
import useWorkspaceChats from "@/hooks/useWorkspaceChats";

export default function WorkspaceChat() {
  const { loading, requiresAuth, mode } = usePasswordModal();

  if (loading) return <FullScreenLoader />;
  if (requiresAuth !== false) {
    return <>{requiresAuth !== null && <PasswordModal mode={mode} />}</>;
  }

  return (
    <SidebarToggleProvider>
      <WorkspaceChatLayout />
    </SidebarToggleProvider>
  );
}

function WorkspaceChatLayout() {
  const { showSidebar } = useSidebarToggle();
  const isMobile = useIsMobileLayout();
  const railVisible = !isMobile && !showSidebar;
  return (
    <div className="w-screen h-screen overflow-hidden bg-zinc-950 light:bg-slate-50 flex">
      {!isMobile && <LeftSidebarIconBar />}
      {!isMobile && <Sidebar />}
      <div
        className={`flex-1 min-w-0 transition-all duration-500 ${railVisible ? "md:ml-[52px]" : ""}`}
      >
        <ShowWorkspaceChat />
      </div>
    </div>
  );
}

function ShowWorkspaceChat() {
  const { slug } = useParams();
  const {
    workspace: rawWorkspace,
    suggestedMessages,
    showAgentCommand,
    isLoading,
  } = useWorkspaceChats(slug);
  const [workspace, setWorkspace] = useState<any>(null);
  // Tracks which workspace `workspace` belongs to. While a new workspace's
  // data is in flight, we keep the previous workspace's chat mounted
  // (Slack/Linear-style transition) instead of flashing a skeleton.
  const [loadedSlug, setLoadedSlug] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!slug) return;
    if (!rawWorkspace) {
      setWorkspace(null);
      setLoadedSlug(slug);
      return;
    }

    setWorkspace({
      ...rawWorkspace,
      suggestedMessages,
      showAgentCommand,
    });
    setLoadedSlug(slug);
    safeSetItem(
      LAST_VISITED_WORKSPACE,
      JSON.stringify({
        slug: rawWorkspace.slug,
        name: rawWorkspace.name,
      }),
    );
  }, [slug, isLoading, rawWorkspace, suggestedMessages, showAgentCommand]);

  return (
    <WorkspaceChatContainer
      loading={loadedSlug !== slug}
      workspace={workspace}
    />
  );
}
