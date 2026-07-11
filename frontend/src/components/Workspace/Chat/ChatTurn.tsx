// SPDX-License-Identifier: MIT
// Purpose: Individual chat turn — renders user/assistant message with header, content, status, and copy action.
// Docs: Based on Issue #607 §10 ChatTurn spec + Issue #4.
import React, { useState } from "react";
import { Robot } from "@phosphor-icons/react/dist/csr/Robot";
import { User } from "@phosphor-icons/react/dist/csr/User";
import { Copy } from "@phosphor-icons/react/dist/csr/Copy";
import { Check } from "@phosphor-icons/react/dist/csr/Check";
import { WarningCircle } from "@phosphor-icons/react/dist/csr/WarningCircle";
import { cn } from "@/utils/cn";
import { IconButton } from "@/components/ui/IconButton";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  status?: "streaming" | "complete" | "error";
};

interface ChatTurnProps {
  message: Message;
  children?: (content: string) => React.ReactNode;
  className?: string;
}

export function ChatTurn({ message, children, className }: ChatTurnProps) {
  const [copied, setCopied] = useState(false);
  const assistant = message.role === "assistant";

  async function copyMessage() {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <article className={cn("group py-5", "first:pt-0", className)}>
      {/* Header */}
      <div className="mb-2 flex items-center gap-2">
        <div
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full",
            assistant
              ? "bg-theme-bg-tertiary text-theme-text-secondary"
              : "bg-[#009ee0] text-white",
          )}
        >
          {assistant ? (
            <Robot size={14} weight="regular" />
          ) : (
            <User size={14} weight="regular" />
          )}
        </div>
        <span className="text-sm font-semibold text-theme-text-primary">
          {assistant ? "OpenSIN" : "Du"}
        </span>
        <span className="text-xs text-theme-text-muted">
          {new Date(message.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
        {message.status === "streaming" && (
          <span className="rounded-full bg-theme-bg-tertiary px-2 py-0.5 text-[10px] font-medium text-theme-text-secondary">
            Generiert
          </span>
        )}
        {message.status === "error" && (
          <span className="flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-500">
            <WarningCircle size={10} />
            Fehlgeschlagen
          </span>
        )}
      </div>

      {/* Content */}
      <div className="pl-9 text-sm leading-relaxed text-theme-text-primary">
        {children ? children(message.content) : message.content}
      </div>

      {/* Actions */}
      <div className="mt-2 pl-9 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <IconButton
          icon={copied ? <Check size={14} /> : <Copy size={14} />}
          label={copied ? "Kopiert" : "Nachricht kopieren"}
          onClick={copyMessage}
          size="sm"
        />
      </div>
    </article>
  );
}
