// SPDX-License-Identifier: MIT
// Purpose: Modern composer — compact input area with attachments, model picker, send/stop, IME-safe Enter handling.
// Docs: Based on Issue #607 §11 Composer spec + Issue #5.
import React, { useRef, useState, type KeyboardEvent } from "react";
import { ArrowUp } from "@phosphor-icons/react/dist/csr/ArrowUp";
import { Paperclip } from "@phosphor-icons/react/dist/csr/Paperclip";
import { Stop } from "@phosphor-icons/react/dist/csr/Stop";
import { Wrench } from "@phosphor-icons/react/dist/csr/Wrench";
import { cn } from "@/utils/cn";
import { IconButton } from "@/components/ui/IconButton";

type Attachment = {
  id: string;
  name: string;
  type: string;
  status: "uploading" | "ready" | "error";
  progress?: number;
};

interface ComposerProps {
  submitting: boolean;
  streaming: boolean;
  attachments: Attachment[];
  onSubmit: (value: string) => Promise<void>;
  onStop: () => void;
  onAttach?: () => void;
  onRemoveAttachment?: (id: string) => void;
  className?: string;
}

export function Composer({
  submitting,
  streaming,
  attachments,
  onSubmit,
  onStop,
  onAttach,
  onRemoveAttachment: _onRemoveAttachment,
  className,
}: ComposerProps) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSubmit = value.trim().length > 0 && !submitting && !streaming;

  async function submit() {
    const content = value.trim();
    if (!content || !canSubmit) return;
    setValue("");
    try {
      await onSubmit(content);
    } catch {
      setValue(content);
    } finally {
      textareaRef.current?.focus();
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing &&
      event.keyCode !== 229
    ) {
      event.preventDefault();
      void submit();
    }
  }

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-0 z-20",
        "bg-theme-bg-primary/95 px-3 pb-3 pt-8",
        className,
      )}
    >
      <div
        className={cn(
          "pointer-events-auto mx-auto max-w-[52rem] rounded-xl border transition-colors",
          focused
            ? "border-theme-text-secondary ring-1 ring-theme-text-secondary"
            : "border-theme-border",
          "bg-theme-bg-sidebar",
        )}
      >
        {/* Attachment previews */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-3 pt-3">
            {attachments.map((a) => (
              <span
                key={a.id}
                className="flex items-center gap-1.5 rounded-md border border-theme-border bg-theme-bg-secondary px-2 py-1 text-xs text-theme-text-secondary"
              >
                {a.name}
                {a.status === "uploading" && (
                  <span className="h-1 w-8 animate-pulse rounded bg-theme-text-muted" />
                )}
              </span>
            ))}
          </div>
        )}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          id="workspace-composer"
          value={value}
          rows={1}
          placeholder="Nachricht an OpenSIN senden"
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="block max-h-56 min-h-12 w-full resize-none border-0 bg-transparent px-3 pb-2 pt-3 text-sm leading-6 text-theme-text-primary outline-none placeholder:text-theme-text-muted"
        />

        {/* Toolbar */}
        <div className="flex items-center justify-between px-3 pb-2">
          <div className="flex items-center gap-1">
            {onAttach && (
              <IconButton
                icon={<Paperclip size={16} />}
                label="Datei anhängen"
                onClick={onAttach}
                size="sm"
              />
            )}
            <IconButton
              icon={<Wrench size={16} />}
              label="Werkzeuge auswählen"
              size="sm"
            />
          </div>
          <div className="flex items-center gap-2">
            {streaming ? (
              <button
                type="button"
                aria-label="Generierung stoppen"
                onClick={onStop}
                className="flex h-8 items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 text-xs font-medium text-red-500 transition-colors hover:bg-red-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                <Stop size={14} />
                Stoppen
              </button>
            ) : (
              <button
                type="button"
                aria-label="Nachricht senden"
                disabled={!canSubmit}
                onClick={() => void submit()}
                className={cn(
                  "flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-text-secondary",
                  canSubmit
                    ? "bg-theme-bg-primary text-theme-text-inverse hover:opacity-90"
                    : "bg-theme-bg-tertiary text-theme-text-muted cursor-not-allowed opacity-50",
                )}
              >
                <ArrowUp size={14} />
                Senden
              </button>
            )}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="px-3 pb-2">
          <p className="text-[10px] text-theme-text-muted">
            OpenSIN kann Fehler machen. Wichtige Informationen bitte prüfen.
          </p>
        </div>
      </div>
    </div>
  );
}
