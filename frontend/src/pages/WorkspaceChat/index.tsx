// SPDX-License-Identifier: MIT
import React, { useEffect, useRef, useState } from "react";
import { default as WorkspaceChatContainer } from "@/components/WorkspaceChat";
import Sidebar, { SidebarMobileHeader } from "@/components/Sidebar";
import LeftSidebarIconBar from "@/components/WorkspaceChat/ChatContainer/LeftSidebarIconBar";
import {
  SidebarToggleProvider,
  useSidebarToggle,
} from "@/components/Sidebar/SidebarToggle";
import { Navigate, useParams } from "react-router-dom";
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
    <div className="w-screen h-screen overflow-hidden bg-theme-bg-primary light:bg-[#f9fafb] flex">
      {!isMobile && <LeftSidebarIconBar />}
      {!isMobile ? <Sidebar /> : <SidebarMobileHeader />}
      <div
        className={`flex-1 min-w-0 transition-all duration-500 ${isMobile ? "pt-14" : ""} ${railVisible ? "md:ml-[52px]" : ""}`}
      >
        <ShowWorkspaceChat />
      </div>
    </div>
  );
}

function ShowWorkspaceChat() {
  const { slug, threadSlug } = useParams();
  const {
    workspace: rawWorkspace,
    suggestedMessages,
    showAgentCommand,
    isLoading,
  } = useWorkspaceChats(slug);
  const [workspace, setWorkspace] = useState<any>(null);
  const [loadedSlug, setLoadedSlug] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const suggestedMessagesRef = useRef(suggestedMessages);
  const showAgentCommandRef = useRef(showAgentCommand);

  useEffect(() => {
    suggestedMessagesRef.current = suggestedMessages;
    showAgentCommandRef.current = showAgentCommand;
  }, [suggestedMessages, showAgentCommand]);

  useEffect(() => {
    if (isLoading) return;
    if (!slug) return;
    if (!rawWorkspace) {
      setWorkspace(null);
      setLoadedSlug(slug);
      setNotFound(true);
      return;
    }

    setNotFound(false);
    setWorkspace({
      ...rawWorkspace,
      suggestedMessages: suggestedMessagesRef.current,
      showAgentCommand: showAgentCommandRef.current,
    });
    setLoadedSlug(slug);
    safeSetItem(
      LAST_VISITED_WORKSPACE,
      JSON.stringify({
        slug: rawWorkspace.slug,
        name: rawWorkspace.name,
      }),
    );
  }, [slug, isLoading, rawWorkspace]);

  if (notFound && !isLoading) {
    return <Navigate to="/" replace />;
  }

  return (
    <WorkspaceChatContainer
      loading={loadedSlug !== slug}
      workspace={workspace}
      threadSlug={threadSlug}
    />
  );
}
