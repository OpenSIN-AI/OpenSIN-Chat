// SPDX-License-Identifier: MIT
import React from "react";
import { useTranslation } from "react-i18next";
import PasswordModal, { usePasswordModal } from "@/components/Modals/Password";
import { FullScreenLoader } from "@/components/Preloader";
import Home from "./Home";
import { useIsMobileLayout } from "@/hooks/useIsMobileLayout";
import Sidebar, { SidebarMobileHeader } from "@/components/Sidebar";
import LeftSidebarIconBar from "@/components/WorkspaceChat/ChatContainer/LeftSidebarIconBar";
import {
  SidebarToggleProvider,
  useSidebarToggle,
} from "@/components/Sidebar/SidebarToggle";

export default function Main() {
  const { t } = useTranslation();
  const { loading, requiresAuth, mode, apiError } = usePasswordModal();

  if (loading) return <FullScreenLoader />;
  if (apiError)
    return (
      <div className="fixed inset-0 bg-zinc-950 light:bg-slate-50 flex flex-col items-center justify-center overflow-hidden p-6">
        <div className="text-center max-w-md">
          <p className="text-red-400 text-xl font-semibold mb-2">
            {t("error.serverUnavailable")}
          </p>
          <p className="text-zinc-400 text-sm">
            {t("error.serverUnavailableDescription")}
          </p>
        </div>
      </div>
    );
  if (requiresAuth !== false)
    return <>{requiresAuth !== null && <PasswordModal mode={mode} />}</>;

  return (
    <SidebarToggleProvider>
      <MainLayout />
    </SidebarToggleProvider>
  );
}

function MainLayout() {
  const { showSidebar } = useSidebarToggle();
  const isMobile = useIsMobileLayout();
  const railVisible = !isMobile && !showSidebar;

  return (
    <div className="w-screen h-screen overflow-hidden bg-zinc-950 light:bg-slate-50 flex">
      {!isMobile ? <LeftSidebarIconBar /> : null}
      {!isMobile ? <Sidebar /> : <SidebarMobileHeader />}
      <div
        className={`flex-1 min-w-0 overflow-hidden ${railVisible ? "md:ml-[52px]" : ""}`}
      >
        <Home />
      </div>
    </div>
  );
}
