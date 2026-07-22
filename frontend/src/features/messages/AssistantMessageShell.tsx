// SPDX-License-Identifier: MIT

import type { ReactNode } from "react";
import type { NotebookModeId } from "@/features/notebook/modes";

interface AssistantMessageShellProps {
  mode?: NotebookModeId;
  children: ReactNode;
  activity?: ReactNode;
  citations?: ReactNode;
  actions?: ReactNode;
  streaming?: boolean;
}

export default function AssistantMessageShell({
  mode = "chat",
  children,
  activity,
  citations,
  actions,
  streaming = false,
}: AssistantMessageShellProps) {
  return (
    <article
      data-message-role="assistant"
      data-notebook-mode={mode}
      className="group/message chat-message-enter relative w-full"
    >
      {mode === "work" && activity && (
        <div className="mb-3">{activity}</div>
      )}

      <div className={["assistant-answer", streaming ? "assistant-answer-streaming" : ""].join(" ")}>
        {children}

        {streaming && (
          <span aria-hidden="true" className="assistant-streaming-cursor" />
        )}
      </div>

      {citations && <div className="mt-4">{citations}</div>}

      {actions && <div className="mt-2">{actions}</div>}
    </article>
  );
}
