// SPDX-License-Identifier: MIT
import WorkspaceModelPicker from "./WorkspaceModelPicker";

/**
 * Top bar of the chat container: settings menu and model picker.
 * Accepts: workspaceSlug, isEmpty
 * The dropdown menu is only shown on the first page (before chat starts).
 * Once the chat has started, all icons are in the right sidebar.
 */
interface ChatHeaderProps {
  workspaceSlug: string;
  isEmpty: boolean;
}

export default function ChatHeader({
  workspaceSlug,
  isEmpty,
}: ChatHeaderProps) {
  return (
    <>
      <WorkspaceModelPicker workspaceSlug={workspaceSlug} />
    </>
  );
}
