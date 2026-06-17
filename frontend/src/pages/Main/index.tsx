// SPDX-License-Identifier: MIT
import React from "react";
import PasswordModal, { usePasswordModal } from "@/components/Modals/Password";
import { FullScreenLoader } from "@/components/Preloader";
import Home from "./Home";
import { isMobile } from "react-device-detect";
import Sidebar, { SidebarMobileHeader } from "@/components/Sidebar";
import LeftSidebarIconBar from "@/components/WorkspaceChat/ChatContainer/LeftSidebarIconBar";
import { SidebarToggleProvider } from "@/components/Sidebar/SidebarToggle";

export default function Main() {
  const { loading, requiresAuth, mode } = usePasswordModal();

  if (loading) return <FullScreenLoader />;
  if (requiresAuth !== false)
    return <>{requiresAuth !== null && <PasswordModal mode={mode} />}</>;

  return (
    <SidebarToggleProvider>
      <div className="w-screen h-screen overflow-hidden bg-zinc-950 light:bg-slate-50 flex">
        {!isMobile ? <LeftSidebarIconBar /> : null}
        {!isMobile ? <Sidebar /> : <SidebarMobileHeader />}
        <Home />
      </div>
    </SidebarToggleProvider>
  );
}
