// SPDX-License-Identifier: MIT
import { isMobile } from "react-device-detect";
import { SidebarMobileHeader } from "../../Sidebar";
import ChatSettingsMenu from "./ChatSettingsMenu";
import WorkspaceModelPicker from "./WorkspaceModelPicker";

/**
 * Top bar of the chat container: mobile header, settings menu, and model picker.
 * Accepts: workspaceSlug, isEmpty
 * The dropdown menu is only shown on the first page (before chat starts).
 * Once the chat has started, all icons are in the right sidebar.
 */
export default function ChatHeader({ workspaceSlug, isEmpty }) {
  return (
    <>
      {isMobile && <SidebarMobileHeader />}
      {isEmpty && <ChatSettingsMenu />}
      <WorkspaceModelPicker workspaceSlug={workspaceSlug} />
    </>
  );
}
