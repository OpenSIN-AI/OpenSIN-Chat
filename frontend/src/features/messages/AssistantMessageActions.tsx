// SPDX-License-Identifier: MIT

import { ArrowClockwise, Check, Copy, SpeakerHigh } from "@phosphor-icons/react";
import { type ReactNode, useState } from "react";
import { copyText } from "@/utils/clipboard";

interface AssistantMessageActionsProps {
  message: string;
  onRegenerate?: () => void;
  readAloudButton?: ReactNode;
  disabled?: boolean;
}

function ActionButton({
  label,
  children,
  onClick,
  disabled,
}: {
  label: string;
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-lg border-none bg-transparent text-theme-text-muted transition-colors hover:bg-theme-bg-secondary hover:text-theme-text-primary disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export default function AssistantMessageActions({
  message,
  onRegenerate,
  readAloudButton,
  disabled = false,
}: AssistantMessageActionsProps) {
  const [copied, setCopied] = useState(false);

  async function copyMessage() {
    const success = await copyText(message);
    if (!success) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div
      aria-label="Antwortaktionen"
      className="flex min-h-8 items-center gap-0.5 opacity-70 transition-opacity group-hover/message:opacity-100"
    >
      <ActionButton
        label={copied ? "Kopiert" : "Kopieren"}
        onClick={copyMessage}
        disabled={disabled}
      >
        {copied ? <Check size={15} weight="bold" /> : <Copy size={15} />}
      </ActionButton>

      {readAloudButton && (
        <div title="Vorlesen" className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-theme-bg-secondary">
          {readAloudButton}
        </div>
      )}

      {!readAloudButton && (
        <ActionButton label="Vorlesen" disabled>
          <SpeakerHigh size={15} />
        </ActionButton>
      )}

      {onRegenerate && (
        <ActionButton label="Neu generieren" onClick={onRegenerate} disabled={disabled}>
          <ArrowClockwise size={15} />
        </ActionButton>
      )}
    </div>
  );
}
