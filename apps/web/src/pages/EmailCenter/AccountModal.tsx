// SPDX-License-Identifier: MIT
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { EnvelopeSimple } from "@phosphor-icons/react/dist/csr/EnvelopeSimple";
import { TerminalWindow } from "@phosphor-icons/react/dist/csr/TerminalWindow";
import type { EmailAccount } from "./types";

interface Props {
  open: boolean;
  account?: EmailAccount | null;
  onClose: () => void;
  onSave: (value: Record<string, unknown>) => Promise<void>;
}

export default function AccountModal({
  open,
  account,
  onClose,
  onSave,
}: Props) {
  const [accountId, setAccountId] = useState("");
  const [label, setLabel] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setAccountId(account?.id || "");
    setLabel(account?.label || "");
    setIsDefault(account?.isDefault || false);
    setEnabled(account?.enabled !== false);
    setError("");
  }, [account, open]);

  if (!open) return null;

  const inputClass =
    "h-10 w-full rounded-lg border border-theme-modal-border bg-theme-bg-secondary px-3 text-sm text-theme-text-primary outline-none placeholder:text-theme-text-muted focus:border-theme-text-secondary";

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave({
        id: accountId.trim(),
        label: label.trim(),
        isDefault,
        enabled,
      });
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <form
        onSubmit={submit}
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-theme-modal-border bg-theme-bg-primary shadow-2xl"
      >
        <header className="flex items-start gap-3 border-b border-theme-modal-border px-5 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-theme-bg-secondary text-theme-text-primary">
            <EnvelopeSimple size={20} weight="fill" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-theme-text-primary">
              {account
                ? "Himalaya-Konto bearbeiten"
                : "Himalaya-Konto aktivieren"}
            </h2>
            <p className="mt-1 text-xs leading-5 text-theme-text-secondary">
              OpenSIN liest nur den Kontoalias aus Himalaya. Das
              Gmail-App-Passwort bleibt im macOS-Keychain und wird nie in
              OpenSIN gespeichert.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-theme-text-secondary hover:bg-theme-bg-secondary hover:text-theme-text-primary"
            aria-label="Schließen"
          >
            <X size={17} />
          </button>
        </header>

        <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
          <div className="sm:col-span-2 rounded-xl border border-theme-modal-border bg-theme-bg-secondary p-3">
            <div className="flex items-start gap-3">
              <TerminalWindow
                size={19}
                className="mt-0.5 shrink-0 text-theme-text-secondary"
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-theme-text-primary">
                  Einmalige Einrichtung außerhalb von OpenSIN
                </p>
                <p className="mt-1 text-[11px] leading-5 text-theme-text-secondary">
                  Nutze den gemeinsamen <code>sin-gmail</code>-Skill oder{" "}
                  <code>himalaya account configure &lt;alias&gt;</code>. Danach
                  genügt hier der Alias, zum Beispiel <code>default</code> oder{" "}
                  <code>energie</code>.
                </p>
              </div>
            </div>
          </div>

          <Field label="Himalaya-Kontoalias">
            <input
              required
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
              placeholder="default"
              disabled={Boolean(account)}
              className={`${inputClass} font-mono disabled:cursor-not-allowed disabled:opacity-60`}
            />
          </Field>
          <Field label="Anzeigename in OpenSIN">
            <input
              required
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Privat, Firma, Support …"
              className={inputClass}
            />
          </Field>

          {account?.email && (
            <div className="sm:col-span-2 rounded-xl border border-theme-modal-border bg-theme-bg-secondary px-3 py-3">
              <span className="block text-[10px] font-semibold uppercase tracking-wide text-theme-text-muted">
                Von Himalaya erkannt
              </span>
              <span className="mt-1 block text-sm text-theme-text-primary">
                {account.email}
              </span>
            </div>
          )}

          <label className="sm:col-span-2 flex cursor-pointer items-center gap-3 rounded-xl border border-theme-modal-border bg-theme-bg-secondary px-3 py-3">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
              className="h-4 w-4"
            />
            <span>
              <span className="block text-sm font-medium text-theme-text-primary">
                In OpenSIN aktivieren
              </span>
              <span className="block text-[11px] text-theme-text-secondary">
                Das Konto bleibt unabhängig davon in Himalaya konfiguriert.
              </span>
            </span>
          </label>

          <label className="sm:col-span-2 flex cursor-pointer items-center gap-3 rounded-xl border border-theme-modal-border bg-theme-bg-secondary px-3 py-3">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(event) => setIsDefault(event.target.checked)}
              className="h-4 w-4"
              disabled={!enabled}
            />
            <span>
              <span className="block text-sm font-medium text-theme-text-primary">
                Als Standardkonto verwenden
              </span>
              <span className="block text-[11px] text-theme-text-secondary">
                Wird verwendet, wenn ein Workflow kein bestimmtes Konto nennt.
              </span>
            </span>
          </label>

          {error && (
            <p className="sm:col-span-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {error}
            </p>
          )}
        </div>

        <footer className="flex justify-end gap-2 border-t border-theme-modal-border px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-lg px-4 text-sm text-theme-text-secondary hover:bg-theme-bg-secondary hover:text-theme-text-primary"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={saving}
            className="h-9 rounded-lg bg-theme-text-primary px-4 text-sm font-semibold text-theme-bg-primary disabled:opacity-50"
          >
            {saving ? "Speichert …" : "Konto speichern"}
          </button>
        </footer>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-theme-text-secondary">
        {label}
      </span>
      {children}
    </label>
  );
}
