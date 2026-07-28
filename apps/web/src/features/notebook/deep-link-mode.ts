// SPDX-License-Identifier: MIT

import type { NotebookModeId } from "./modes";

/** Agent deep-links that require action/tool controls must open Work mode. */
export function notebookModeForAgentDeepLink(
  agentMode: string | null | undefined,
): NotebookModeId | null {
  return agentMode === "deep-research" || agentMode === "report"
    ? "work"
    : null;
}
