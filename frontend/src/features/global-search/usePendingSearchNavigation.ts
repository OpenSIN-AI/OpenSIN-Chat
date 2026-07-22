// SPDX-License-Identifier: MIT

import { useEffect } from "react";
import { consumePendingSearchNavigation } from "./pending-navigation";

interface UsePendingSearchNavigationOptions {
  workspaceSlug?: string | null;
  threadSlug?: string | null;
  openSidebar?: (type: string, data?: unknown) => void;
}

export default function usePendingSearchNavigation({
  workspaceSlug,
  threadSlug,
  openSidebar,
}: UsePendingSearchNavigationOptions) {
  useEffect(() => {
    if (!workspaceSlug) return;

    const pending = consumePendingSearchNavigation();
    if (!pending) return;

    if (pending.workspaceSlug !== workspaceSlug) return;

    if (pending.threadSlug && pending.threadSlug !== threadSlug) return;

    if (pending.sidebar && openSidebar) {
      openSidebar(pending.sidebar, {
        sourceId: pending.sourceId,
        noteId: pending.noteId,
        artifactUuid: pending.artifactUuid,
      });
    }

    if (!pending.chatId) return;

    window.setTimeout(() => {
      const element = document.getElementById(
        `chat-message-${pending.chatId}`,
      );

      if (!element) return;

      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.classList.add("search-result-highlight");

      window.setTimeout(
        () => element.classList.remove("search-result-highlight"),
        2_000,
      );
    }, 120);
  }, [workspaceSlug, threadSlug, openSidebar]);
}
