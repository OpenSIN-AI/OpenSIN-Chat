// SPDX-License-Identifier: MIT
import { useTranslation } from "react-i18next";
import PasswordModal, { usePasswordModal } from "@/components/Modals/Password";
import { FullScreenLoader } from "@/components/Preloader";
import Home from "./Home";
import { useIsMobileLayout } from "@/hooks/useIsMobileLayout";
import Sidebar, { SidebarMobileHeader } from "@/components/Sidebar";
import LeftSidebarIconBar from "@/components/WorkspaceChat/ChatContainer/LeftSidebarIconBar";
import { SidebarToggleProvider } from "@/components/Sidebar/SidebarToggle";

export default function Main() {
  const { t } = useTranslation();
  const { loading, requiresAuth, mode, apiError } = usePasswordModal();

  if (loading) return <FullScreenLoader />;
  if (apiError)
    return (
      <div className="fixed inset-0 bg-theme-bg-primary light:bg-[#f9fafb] flex flex-col items-center justify-center overflow-hidden p-6">
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
  const isMobile = useIsMobileLayout();

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-theme-bg-primary">
      {!isMobile ? <LeftSidebarIconBar /> : null}
      {!isMobile ? <Sidebar /> : <SidebarMobileHeader />}
      <div
        className={`flex-1 min-w-0 overflow-hidden${isMobile ? " pt-14" : ""}`}
      >
        <Home />
      </div>
    </div>
  );
}
