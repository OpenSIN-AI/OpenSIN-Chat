// SPDX-License-Identifier: MIT
import { useEffect, useState } from "react";
import { Buildings } from "@phosphor-icons/react/dist/csr/Buildings";
import { X } from "@phosphor-icons/react/dist/csr/X";
import type { EmailGroup } from "./types";

interface Props {
  open: boolean;
  group?: EmailGroup | null;
  onClose: () => void;
  onSave: (value: Record<string, unknown>) => Promise<void>;
}

function values(text: string) {
  return text
    .split(/[\n,;]+/)
    .map((value) => value.trim())
    .filter(Boolean);
}

export default function GroupModal({ open, group, onClose, onSave }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [emails, setEmails] = useState("");
  const [domains, setDomains] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(group?.name || "");
    setDescription(group?.description || "");
    setEmails((group?.emails || []).join("\n"));
    setDomains((group?.domains || []).join("\n"));
    setError("");
  }, [group, open]);

  if (!open) return null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave({
        id: group?.id,
        name,
        description,
        emails: values(emails),
        domains: values(domains),
      });
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "h-10 w-full rounded-lg border border-theme-modal-border bg-theme-bg-secondary px-3 text-sm text-theme-text-primary outline-none focus:border-theme-text-secondary";
  const areaClass = "min-h-28 w-full resize-y rounded-lg border border-theme-modal-border bg-theme-bg-secondary px-3 py-2 text-sm text-theme-text-primary outline-none focus:border-theme-text-secondary";

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form onSubmit={submit} className="w-full max-w-2xl overflow-hidden rounded-2xl border border-theme-modal-border bg-theme-bg-primary shadow-2xl">
        <header className="flex items-start gap-3 border-b border-theme-modal-border px-5 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-theme-bg-secondary"><Buildings size={20} /></div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-theme-text-primary">{group ? "Gruppe bearbeiten" : "Organisation oder Gruppe anlegen"}</h2>
            <p className="mt-1 text-xs text-theme-text-secondary">Fasse mehrere Ansprechpartner, Mitarbeiter und Domains zu einem gemeinsamen Kontext zusammen.</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-theme-text-secondary hover:bg-theme-bg-secondary" aria-label="Schließen"><X size={17} /></button>
        </header>
        <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-theme-text-secondary">Name</span>
            <input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Hausverwaltung, Jobcenter, Kunde …" className={inputClass} />
          </label>
          <label className="sm:col-span-2">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-theme-text-secondary">Beschreibung</span>
            <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Worum geht es bei dieser Organisation?" className={inputClass} />
          </label>
          <label>
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-theme-text-secondary">E-Mail-Adressen</span>
            <textarea value={emails} onChange={(event) => setEmails(event.target.value)} placeholder={"mitarbeiter@firma.de\nservice@firma.de"} className={areaClass} />
          </label>
          <label>
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-theme-text-secondary">Domains</span>
            <textarea value={domains} onChange={(event) => setDomains(event.target.value)} placeholder={"firma.de\nverwaltung.de"} className={areaClass} />
          </label>
          {error && <p className="sm:col-span-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>}
        </div>
        <footer className="flex justify-end gap-2 border-t border-theme-modal-border px-5 py-4">
          <button type="button" onClick={onClose} className="h-9 rounded-lg px-4 text-sm text-theme-text-secondary hover:bg-theme-bg-secondary">Abbrechen</button>
          <button type="submit" disabled={saving} className="h-9 rounded-lg bg-theme-text-primary px-4 text-sm font-semibold text-theme-bg-primary disabled:opacity-50">{saving ? "Speichert …" : "Gruppe speichern"}</button>
        </footer>
      </form>
    </div>
  );
}
