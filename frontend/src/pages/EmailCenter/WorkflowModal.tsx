// SPDX-License-Identifier: MIT
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { FlowArrow } from "@phosphor-icons/react/dist/csr/FlowArrow";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { buildCronFromBuilderState } from "@/pages/GeneralSettings/ScheduledJobs/utils/cron";
import type { EmailAccount, EmailGroup, EmailWorkflow, ToolCategory } from "./types";

interface Props {
  open: boolean;
  workflow?: EmailWorkflow | null;
  accounts: EmailAccount[];
  groups: EmailGroup[];
  toolCategories: ToolCategory[];
  onClose: () => void;
  onSave: (value: Record<string, unknown>) => Promise<void>;
}

const DAILY_8_LOCAL = buildCronFromBuilderState({
  frequency: "day",
  hour: 8,
  minute: 0,
});
const WEEKLY_MONDAY_8_LOCAL = buildCronFromBuilderState({
  frequency: "week",
  hour: 8,
  minute: 0,
  weekdays: [1],
});

const CADENCES = [
  { label: "Alle 10 Minuten", cron: "*/10 * * * *" },
  { label: "Stündlich", cron: "0 * * * *" },
  { label: "Täglich um 08:00 (lokal)", cron: DAILY_8_LOCAL },
  { label: "Wöchentlich montags 08:00 (lokal)", cron: WEEKLY_MONDAY_8_LOCAL },
];

const ACTION_PRESETS = [
  "Nutzer benachrichtigen und die passende E-Mail zusammenfassen",
  "Einen Antwortentwurf erstellen",
  "Direkt antworten, wenn die Antwort eindeutig ist",
  "Nach erfolgreicher Bearbeitung als gelesen markieren und archivieren",
  "Anhänge auswerten und wichtige Daten extrahieren",
];

export default function WorkflowModal({
  open,
  workflow,
  accounts,
  groups,
  toolCategories,
  onClose,
  onSave,
}: Props) {
  const [name, setName] = useState("");
  const [accountIds, setAccountIds] = useState<string[]>([]);
  const [groupId, setGroupId] = useState("");
  const [instruction, setInstruction] = useState("");
  const [sender, setSender] = useState("");
  const [subject, setSubject] = useState("");
  const [condition, setCondition] = useState("");
  const [actions, setActions] = useState<string[]>([]);
  const [customAction, setCustomAction] = useState("");
  const [cadence, setCadence] = useState(CADENCES[1].cron);
  const [customCron, setCustomCron] = useState("");
  const [safetyMode, setSafetyMode] = useState<"notify" | "approval" | "automatic">("approval");
  const [toolIds, setToolIds] = useState<string[]>([]);
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const knownCadence = CADENCES.find((item) => item.cron === workflow?.schedule);
    setName(workflow?.name || "");
    setAccountIds(
      workflow?.accountIds?.length
        ? workflow.accountIds
        : accounts.filter((account) => account.isDefault).map((account) => account.id).length
          ? accounts.filter((account) => account.isDefault).map((account) => account.id)
          : accounts[0]
            ? [accounts[0].id]
            : [],
    );
    setGroupId(workflow?.groupId || "");
    setInstruction(workflow?.instruction || "");
    setSender(workflow?.sender || "");
    setSubject(workflow?.subject || "");
    setCondition(workflow?.condition || "");
    setActions(workflow?.actions || [ACTION_PRESETS[0]]);
    setCustomAction("");
    setCadence(knownCadence?.cron || (workflow?.schedule ? "custom" : CADENCES[1].cron));
    setCustomCron(knownCadence ? "" : workflow?.schedule || "");
    setSafetyMode(workflow?.safetyMode || "approval");
    setToolIds(workflow?.toolIds || []);
    setError("");
  }, [accounts, open, workflow]);

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === groupId) || null,
    [groupId, groups],
  );
  const integrationCategories = useMemo(
    () => toolCategories.filter((category) => category.category !== "gmail-agent"),
    [toolCategories],
  );

  if (!open) return null;

  function toggleAccount(id: string) {
    setAccountIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function toggleAction(action: string) {
    setActions((current) =>
      current.includes(action) ? current.filter((item) => item !== action) : [...current, action],
    );
  }

  function toggleTool(id: string) {
    setToolIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const finalActions = [...actions, ...(customAction.trim() ? [customAction.trim()] : [])];
    if (accountIds.length === 0 || finalActions.length === 0) {
      setError("Wähle mindestens ein Konto und eine Aktion aus.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const selectedCadence = CADENCES.find((item) => item.cron === cadence);
      await onSave({
        id: workflow?.id,
        name,
        accountIds,
        groupId: selectedGroup?.id || null,
        groupName: selectedGroup?.name || "",
        groupMembers: selectedGroup
          ? [...selectedGroup.emails, ...selectedGroup.domains.map((domain) => `@${domain}`)]
          : [],
        instruction,
        sender,
        subject,
        condition,
        actions: finalActions,
        safetyMode,
        schedule: cadence === "custom" ? customCron : cadence,
        cadenceLabel: selectedCadence?.label || "Eigener Zeitplan",
        toolIds,
        enabled: workflow?.enabled ?? true,
      });
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  }

  const input = "h-10 w-full rounded-lg border border-theme-modal-border bg-theme-bg-secondary px-3 text-sm text-theme-text-primary outline-none placeholder:text-theme-text-muted focus:border-theme-text-secondary";

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/55 p-3 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form onSubmit={submit} className="flex max-h-[94dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-theme-modal-border bg-theme-bg-primary shadow-2xl">
        <header className="flex items-start gap-3 border-b border-theme-modal-border px-5 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-theme-bg-secondary"><FlowArrow size={20} /></div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-theme-text-primary">{workflow ? "E-Mail-Workflow bearbeiten" : "Neuen E-Mail-Workflow bauen"}</h2>
            <p className="mt-1 text-xs text-theme-text-secondary">Beschreibe Auslöser und Ziel. Die KI prüft Inhalt und Bedeutung und kann weitere Apps als Werkzeuge verwenden.</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-theme-text-secondary hover:bg-theme-bg-secondary" aria-label="Schließen"><X size={17} /></button>
        </header>

        <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto p-5 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-5">
            <Section number="1" title="Grundlage">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-theme-text-secondary">Workflow-Name</span>
                <input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Hausverwaltung überwachen" className={input} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-theme-text-secondary">KI-Auftrag in natürlicher Sprache</span>
                <textarea
                  value={instruction}
                  onChange={(event) => setInstruction(event.target.value)}
                  placeholder="Zum Beispiel: Beobachte alle meine Konten auf Antworten der Hausverwaltung. Wenn ein Termin bestätigt wird, informiere mich, erstelle einen Kalendereintrag und bereite eine freundliche Antwort vor."
                  className="min-h-24 w-full resize-y rounded-lg border border-theme-modal-border bg-theme-bg-secondary px-3 py-2 text-sm leading-5 text-theme-text-primary outline-none placeholder:text-theme-text-muted focus:border-theme-text-secondary"
                />
                <span className="mt-1 block text-[10px] leading-4 text-theme-text-muted">Die Felder darunter schärfen den Auftrag. Sie ersetzen ihn nicht.</span>
              </label>
              <div>
                <span className="mb-2 block text-xs font-medium text-theme-text-secondary">Gmail-Konten</span>
                <div className="grid gap-2 sm:grid-cols-2">
                  {accounts.map((account) => (
                    <label key={account.id} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 ${accountIds.includes(account.id) ? "border-theme-text-secondary bg-theme-bg-tertiary" : "border-theme-modal-border bg-theme-bg-secondary"}`}>
                      <input type="checkbox" checked={accountIds.includes(account.id)} onChange={() => toggleAccount(account.id)} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-theme-text-primary">{account.label}</span>
                        <span className="block truncate text-[10px] text-theme-text-secondary">{account.email || account.id}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-theme-text-secondary">Organisation / Gruppe</span>
                <select value={groupId} onChange={(event) => setGroupId(event.target.value)} className={input}>
                  <option value="">Keine feste Gruppe</option>
                  {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                </select>
              </label>
            </Section>

            <Section number="2" title="Wann passt eine E-Mail?">
              <div className="grid gap-3 sm:grid-cols-2">
                <label>
                  <span className="mb-1.5 block text-xs font-medium text-theme-text-secondary">Absender</span>
                  <input value={sender} onChange={(event) => setSender(event.target.value)} placeholder="Person, Adresse oder Domain" className={input} />
                </label>
                <label>
                  <span className="mb-1.5 block text-xs font-medium text-theme-text-secondary">Betreff</span>
                  <input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Wörter oder Thema" className={input} />
                </label>
              </div>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-theme-text-secondary">Intelligente inhaltliche Bedingung</span>
                <textarea value={condition} onChange={(event) => setCondition(event.target.value)} placeholder="Zum Beispiel: Die Hausverwaltung bestätigt einen Termin, fordert Unterlagen an oder lehnt etwas ab. Werbung und automatische Empfangsbestätigungen ignorieren." className="min-h-28 w-full resize-y rounded-lg border border-theme-modal-border bg-theme-bg-secondary px-3 py-2 text-sm leading-5 text-theme-text-primary outline-none placeholder:text-theme-text-muted focus:border-theme-text-secondary" />
              </label>
            </Section>
          </div>

          <div className="space-y-5">
            <Section number="3" title="Was soll passieren?">
              <div className="space-y-2">
                {ACTION_PRESETS.map((action) => (
                  <label key={action} className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-theme-bg-secondary">
                    <input type="checkbox" checked={actions.includes(action)} onChange={() => toggleAction(action)} className="mt-0.5" />
                    <span className="text-xs leading-5 text-theme-text-primary">{action}</span>
                  </label>
                ))}
              </div>
              <input value={customAction} onChange={(event) => setCustomAction(event.target.value)} placeholder="Weitere eigene Aktion, z. B. Notion-Seite aktualisieren …" className={input} />
              <button type="button" onClick={() => setShowIntegrations((value) => !value)} className="text-xs font-medium text-theme-text-secondary hover:text-theme-text-primary">
                {showIntegrations ? "Integrationen ausblenden" : `Weitere Apps und Werkzeuge auswählen${toolIds.length ? ` (${toolIds.length})` : ""}`}
              </button>
              {showIntegrations && (
                <div className="max-h-48 space-y-3 overflow-y-auto rounded-xl border border-theme-modal-border bg-theme-bg-secondary p-3">
                  {integrationCategories.map((category) => (
                    <div key={category.category}>
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-theme-text-muted">{category.name}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {category.items.map((tool) => (
                          <button key={tool.id} type="button" disabled={tool.requiresSetup} onClick={() => toggleTool(tool.id)} className={`rounded-full border px-2.5 py-1 text-[10px] ${toolIds.includes(tool.id) ? "border-theme-text-secondary bg-theme-bg-tertiary text-theme-text-primary" : "border-theme-modal-border text-theme-text-secondary hover:text-theme-text-primary"} disabled:opacity-40`}>{tool.name}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section number="4" title="Zeitplan und Sicherheit">
              <div className="grid grid-cols-2 gap-2">
                {CADENCES.map((item) => (
                  <button key={item.cron} type="button" onClick={() => setCadence(item.cron)} className={`rounded-xl border px-3 py-2 text-left text-xs ${cadence === item.cron ? "border-theme-text-secondary bg-theme-bg-tertiary text-theme-text-primary" : "border-theme-modal-border bg-theme-bg-secondary text-theme-text-secondary"}`}>{item.label}</button>
                ))}
                <button type="button" onClick={() => setCadence("custom")} className={`rounded-xl border px-3 py-2 text-left text-xs ${cadence === "custom" ? "border-theme-text-secondary bg-theme-bg-tertiary text-theme-text-primary" : "border-theme-modal-border bg-theme-bg-secondary text-theme-text-secondary"}`}>Eigener Cron-Zeitplan</button>
              </div>
              {cadence === "custom" && <input required value={customCron} onChange={(event) => setCustomCron(event.target.value)} placeholder="*/30 * * * *" className={`${input} font-mono`} />}
              <div className="grid gap-2 sm:grid-cols-3">
                {[
                  ["notify", "Nur melden", "Keine Änderungen"],
                  ["approval", "Mit Freigabe", "Entwürfe statt Senden"],
                  ["automatic", "Automatisch", "Aktionen selbst ausführen"],
                ].map(([id, title, description]) => (
                  <button key={id} type="button" onClick={() => setSafetyMode(id as typeof safetyMode)} className={`rounded-xl border p-3 text-left ${safetyMode === id ? "border-theme-text-secondary bg-theme-bg-tertiary" : "border-theme-modal-border bg-theme-bg-secondary"}`}>
                    <span className="block text-xs font-semibold text-theme-text-primary">{title}</span>
                    <span className="mt-1 block text-[10px] leading-4 text-theme-text-secondary">{description}</span>
                  </button>
                ))}
              </div>
              {error && <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>}
            </Section>
          </div>
        </div>

        <footer className="flex items-center justify-between border-t border-theme-modal-border px-5 py-4">
          <p className="hidden text-[10px] text-theme-text-muted sm:block">Workflows laufen über die bestehende persistente Aufgaben-Engine und überleben Neustarts.</p>
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={onClose} className="h-9 rounded-lg px-4 text-sm text-theme-text-secondary hover:bg-theme-bg-secondary">Abbrechen</button>
            <button type="submit" disabled={saving || accounts.length === 0} className="h-9 rounded-lg bg-theme-text-primary px-4 text-sm font-semibold text-theme-bg-primary disabled:opacity-50">{saving ? "Speichert …" : "Workflow aktivieren"}</button>
          </div>
        </footer>
      </form>
    </div>
  );
}

function Section({ number, title, children }: { number: string; title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-theme-modal-border bg-theme-bg-primary p-4">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-theme-text-primary text-[10px] font-bold text-theme-bg-primary">{number}</span>
        <h3 className="text-sm font-semibold text-theme-text-primary">{title}</h3>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
