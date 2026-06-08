// SPDX-License-Identifier: MIT
import { isMobile } from "react-device-detect";
import { SidebarMobileHeader } from "../../Sidebar";
import ChatSettingsMenu from "./ChatSettingsMenu";
import WorkspaceModelPicker from "./WorkspaceModelPicker";

/**
 * Top bar of the chat container: mobile header, settings menu, and model picker.
 * Accepts: workspaceSlug
 */
export default function ChatHeader({ workspaceSlug }) {
  return (
    <>
      {isMobile && <SidebarMobileHeader />}
      <ChatSettingsMenu />
      <WorkspaceModelPicker workspaceSlug={workspaceSlug} />
    </>
  );
}
