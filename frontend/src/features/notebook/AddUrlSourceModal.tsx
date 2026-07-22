// SPDX-License-Identifier: MIT

import { FormEvent, useState } from "react";
import { Link as LinkIcon } from "@phosphor-icons/react/dist/csr/Link";
import { X } from "@phosphor-icons/react/dist/csr/X";

interface AddUrlSourceModalProps {
  open: boolean;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (url: string) => Promise<void> | void;
}

export default function AddUrlSourceModal({ open, loading = false, onClose, onSubmit }: AddUrlSourceModalProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    let normalized: URL;
    try {
      normalized = new URL(url.trim());
      if (normalized.protocol !== "https:" && normalized.protocol !== "http:") throw new Error();
    } catch {
      setError("Bitte gib eine vollständige HTTP- oder HTTPS-Adresse ein.");
      return;
    }
    try {
      await onSubmit(normalized.toString());
      setUrl("");
      onClose();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Die Quelle konnte nicht hinzugefügt werden.");
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Link hinzufügen"
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <form onSubmit={handleSubmit} className="w-full max-w-lg rounded-2xl border border-theme-border bg-theme-bg-primary p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-theme-text-primary">Link hinzufügen</h2>
            <p className="mt-1 text-xs leading-5 text-theme-text-secondary">Webseiten, YouTube-Videos und öffentliche Social-Media-Beiträge werden automatisch erkannt.</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-none bg-transparent text-theme-text-secondary hover:bg-theme-bg-secondary" aria-label="Schließen">
            <X size={17} />
          </button>
        </div>
        <label className="mt-5 block">
          <span className="mb-2 block text-xs font-medium text-theme-text-primary">Adresse</span>
          <div className="flex items-center gap-2 rounded-xl border border-theme-border bg-theme-bg-secondary px-3 focus-within:border-theme-text-secondary">
            <LinkIcon size={16} className="text-theme-text-secondary" />
            <input autoFocus type="url" value={url} disabled={loading} onChange={(event) => setUrl(event.target.value)} placeholder="https://…" className="h-11 min-w-0 flex-1 border-none bg-transparent text-sm text-theme-text-primary outline-none placeholder:text-theme-text-secondary" />
          </div>
        </label>
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={loading} className="h-9 rounded-lg border-none bg-transparent px-3 text-sm text-theme-text-secondary hover:bg-theme-bg-secondary">Abbrechen</button>
          <button type="submit" disabled={loading || !url.trim()} className="h-9 rounded-lg border-none bg-theme-text-primary px-4 text-sm font-medium text-theme-bg-primary disabled:cursor-not-allowed disabled:opacity-50">
            {loading ? "Wird hinzugefügt …" : "Hinzufügen"}
          </button>
        </div>
      </form>
    </div>
  );
}
