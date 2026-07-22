// SPDX-License-Identifier: MIT

import type { NotebookModeId } from "@/features/notebook/modes";
import { readSelectedSources } from "@/features/notebook/selected-source-storage";
import { readNotebookMode } from "@/features/notebook/notebook-mode-storage";
import { readSelectedCodeRunnerId } from "@/features/code-runners/useSelectedCodeRunner";

export interface ChatRequestContext {
  turnId: string;
  notebookMode: NotebookModeId;
  sourceSelectionExplicit: boolean;
  selectedSourceIds: string[];
  codeRunnerId: string | null;
}

interface BuildChatRequestContextOptions {
  notebookSlug?: string | null;
  threadSlug?: string | null;
  codeRunnerId?: string | null;
}

export function buildChatRequestContext({
  notebookSlug,
  threadSlug,
  codeRunnerId = null,
}: BuildChatRequestContextOptions): ChatRequestContext {
  const selection = readSelectedSources({ notebookSlug, threadSlug });
  const mode = readNotebookMode({ notebookSlug, threadSlug });

  return {
    turnId: crypto.randomUUID(),
    notebookMode: mode,
    sourceSelectionExplicit: selection.explicit,
    selectedSourceIds: selection.sourceIds,
    codeRunnerId:
      mode === "code" && typeof codeRunnerId === "string" && codeRunnerId.trim()
        ? codeRunnerId.trim()
        : typeof codeRunnerId === "string" && codeRunnerId.trim()
          ? codeRunnerId.trim()
          : null,
  };
}
