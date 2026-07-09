// SPDX-License-Identifier: MIT
import { useIsMobileLayout } from "@/hooks/useIsMobileLayout";
import Sidebar from "@/components/SettingsSidebar";
import ContextualSaveBar from "@/components/ContextualSaveBar";

export default function AgentLayout({
  children,
  hasChanges,
  handleSubmit,
  handleCancel,
}: {
  children: React.ReactNode;
  hasChanges: boolean;
  handleSubmit: () => void;
  handleCancel: () => void;
}) {
  const isMobile = useIsMobileLayout();
  return (
    <div
      id="workspace-agent-settings-container"
      className="w-screen h-screen overflow-hidden bg-theme-bg-container flex md:mt-0 mt-6"
    >
      <Sidebar />
      <div
        style={{ "--content-height": isMobile ? "100%" : "calc(100% - 32px)" }}
        className="h-[var(--content-height)] relative md:ml-[2px] md:mr-[16px] md:my-[16px] md:rounded-[16px] w-full flex"
      >
        {children}
        <ContextualSaveBar
          showing={hasChanges}
          onSave={handleSubmit}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}
