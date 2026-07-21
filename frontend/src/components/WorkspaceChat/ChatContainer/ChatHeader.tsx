// SPDX-License-Identifier: MIT
import WorkspaceModelPicker from "./WorkspaceModelPicker";

/**
 * Top bar of the chat container: model picker.
 * Mobile right-rail tools live in Sidebars → MobileSidebarMenu (bottom FAB),
 * not here — avoids a second entry point fighting the left-nav header.
 */
interface ChatHeaderProps {
  workspaceSlug: string;
  isEmpty: boolean;
}

export default function ChatHeader({ workspaceSlug }: ChatHeaderProps) {
  return <WorkspaceModelPicker workspaceSlug={workspaceSlug} />;
}
