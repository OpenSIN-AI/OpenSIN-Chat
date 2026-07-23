// SPDX-License-Identifier: MIT
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { useIsMobileLayout } from "@/hooks/useIsMobileLayout";
import { SidebarToggleProvider } from "@/components/Sidebar/SidebarToggle";
import EmailAutomation from "@/models/emailAutomation";
import showToast from "@/utils/toast";
import useConfirm from "@/hooks/useConfirm";
import { ArrowClockwise } from "@phosphor-icons/react/dist/csr/ArrowClockwise";
import { Buildings } from "@phosphor-icons/react/dist/csr/Buildings";
import { CheckCircle } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { Clock } from "@phosphor-icons/react/dist/csr/Clock";
import { DotsThree } from "@phosphor-icons/react/dist/csr/DotsThree";
import { EnvelopeOpen } from "@phosphor-icons/react/dist/csr/EnvelopeOpen";
import { EnvelopeSimple } from "@phosphor-icons/react/dist/csr/EnvelopeSimple";
import { FlowArrow } from "@phosphor-icons/react/dist/csr/FlowArrow";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { PaperPlaneTilt } from "@phosphor-icons/react/dist/csr/PaperPlaneTilt";
import { Plus } from "@phosphor-icons/react/dist/csr/Plus";
import { ShieldCheck } from "@phosphor-icons/react/dist/csr/ShieldCheck";
import { Trash } from "@phosphor-icons/react/dist/csr/Trash";
import AccountModal from "./AccountModal";
import GroupModal from "./GroupModal";
import WorkflowModal from "./WorkflowModal";
import type {
  EmailAccount,
  EmailBootstrap,
  EmailGroup,
  EmailWorkflow,
} from "./types";

const Sidebar = lazy(() => import("@/components/Sidebar"));
const SidebarMobileHeader = lazy(() =>
  import("@/components/Sidebar").then((module) => ({
    default: module.SidebarMobileHeader,
  })),
);

type TabId = "workflows" | "mailbox" | "groups" | "accounts";

const EMPTY: EmailBootstrap = {
  accounts: [],
  groups: [],
  workflows: [],
  toolCategories: [],
  defaultAccountId: "",
};

export default function EmailCenterPage() {
  return (
    <SidebarToggleProvider>
      <EmailCenterLayout />
    </SidebarToggleProvider>
  );
}

function EmailCenterLayout() {
  const isMobile = useIsMobileLayout();
  const confirm = useConfirm();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<TabId>("workflows");
  const [data, setData] = useState<EmailBootstrap>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [workflowOpen, setWorkflowOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<EmailWorkflow | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<EmailAccount | null>(null);
  const [groupOpen, setGroupOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<EmailGroup | null>(null);
  const [openWorkflowAfterAccount, setOpenWorkflowAfterAccount] = useState(false);

  const refresh = useCallback(async (quiet = false) => {
    if (!quiet) setRefreshing(true);
    try {
      const result = (await EmailAutomation.bootstrap()) as EmailBootstrap;
      setData({ ...EMPTY, ...result });
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), "error", { clear: true });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh(true);
  }, [refresh]);

  useEffect(() => {
    if (loading || searchParams.get("new") !== "workflow") return;
    setSearchParams({}, { replace: true });
    if (data.accounts.length === 0) {
      setTab("accounts");
      setEditingAccount(null);
      setOpenWorkflowAfterAccount(true);
      setAccountOpen(true);
      showToast(
        "Verbinde zuerst ein Gmail-Konto. Danach öffnet sich der Workflow-Builder.",
        "info",
        { clear: true },
      );
      return;
    }
    setEditingWorkflow(null);
    setWorkflowOpen(true);
  }, [data.accounts.length, loading, searchParams, setSearchParams]);

  const openWorkflow = (workflow: EmailWorkflow | null = null) => {
    if (!workflow && data.accounts.length === 0) {
      setTab("accounts");
      setEditingAccount(null);
      setOpenWorkflowAfterAccount(true);
      setAccountOpen(true);
      showToast(
        "Verbinde zuerst ein Gmail-Konto. Danach öffnet sich direkt der Workflow-Builder.",
        "info",
        { clear: true },
      );
      return;
    }
    setEditingWorkflow(workflow);
    setWorkflowOpen(true);
  };

  async function saveWorkflow(value: Record<string, unknown>) {
    await EmailAutomation.saveWorkflow(value);
    await refresh(true);
    showToast("E-Mail-Workflow wurde gespeichert.", "success", { clear: true });
  }

  async function saveAccount(value: Record<string, unknown>) {
    await EmailAutomation.saveAccount(value);
    await refresh(true);
    showToast("Gmail-Konto wurde verbunden.", "success", { clear: true });
    if (openWorkflowAfterAccount) {
      setOpenWorkflowAfterAccount(false);
      setTab("workflows");
      setEditingWorkflow(null);
      setWorkflowOpen(true);
    }
  }

  async function saveGroup(value: Record<string, unknown>) {
    await EmailAutomation.saveGroup(value);
    await refresh(true);
    showToast("Gruppe wurde gespeichert.", "success", { clear: true });
  }

  async function deleteWorkflow(workflow: EmailWorkflow) {
    if (!(await confirm({ title: `Workflow „${workflow.name}“ löschen?`, confirmLabel: "Löschen", destructive: true }))) return;
    try {
      await EmailAutomation.deleteWorkflow(workflow.id);
      await refresh(true);
      showToast("Workflow wurde gelöscht.", "success", { clear: true });
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), "error", { clear: true });
    }
  }

  async function deleteAccount(account: EmailAccount) {
    if (!(await confirm({ title: `Gmail-Konto „${account.label}“ entfernen?`, confirmLabel: "Entfernen", destructive: true }))) return;
    try {
      await EmailAutomation.deleteAccount(account.id);
      await refresh(true);
      showToast("Gmail-Konto wurde entfernt.", "success", { clear: true });
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), "error", { clear: true });
    }
  }

  async function deleteGroup(group: EmailGroup) {
    if (!(await confirm({ title: `Gruppe „${group.name}“ löschen?`, confirmLabel: "Löschen", destructive: true }))) return;
    try {
      await EmailAutomation.deleteGroup(group.id);
      await refresh(true);
      showToast("Gruppe wurde gelöscht.", "success", { clear: true });
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), "error", { clear: true });
    }
  }

  const primaryAction = () => {
    if (tab === "workflows") openWorkflow();
    if (tab === "accounts") {
      setEditingAccount(null);
      setAccountOpen(true);
    }
    if (tab === "groups") {
      setEditingGroup(null);
      setGroupOpen(true);
    }
  };

  const primaryLabel =
    tab === "workflows"
      ? "Neuer Workflow"
      : tab === "accounts"
        ? "Konto hinzufügen"
        : tab === "groups"
          ? "Neue Gruppe"
          : null;

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-theme-bg-primary">
      <Suspense fallback={null}>
        {!isMobile ? <Sidebar /> : <SidebarMobileHeader />}
      </Suspense>
      <main className={`min-w-0 flex-1 overflow-hidden ${isMobile ? "pt-14" : ""}`}>
        <div className="flex h-full min-h-0 flex-col bg-theme-bg-primary">
          <header className="shrink-0 border-b border-theme-modal-border px-4 py-4 sm:px-6">
            <div className="mx-auto flex max-w-7xl items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-theme-modal-border bg-theme-bg-secondary text-theme-text-primary">
                <EnvelopeSimple size={22} weight="fill" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-lg font-semibold tracking-tight text-theme-text-primary">E-Mail Zentrale</h1>
                  <span className="rounded-full border border-theme-modal-border bg-theme-bg-secondary px-2 py-0.5 text-[10px] text-theme-text-secondary">
                    {data.accounts.length} {data.accounts.length === 1 ? "Konto" : "Konten"}
                  </span>
                  <span className="rounded-full border border-theme-modal-border bg-theme-bg-secondary px-2 py-0.5 text-[10px] text-theme-text-secondary">
                    {data.workflows.filter((workflow) => workflow.enabled).length} aktiv
                  </span>
                </div>
                <p className="mt-1 max-w-3xl text-xs leading-5 text-theme-text-secondary">
                  Ein Postfach für mehrere Gmail-Konten, intelligente Organisationen und autonome Workflows mit deinen vorhandenen Agenten und Apps.
                </p>
              </div>
              <button type="button" onClick={() => refresh()} disabled={refreshing} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-theme-text-secondary hover:bg-theme-bg-secondary hover:text-theme-text-primary disabled:opacity-40" aria-label="Aktualisieren">
                <ArrowClockwise size={17} className={refreshing ? "animate-spin" : ""} />
              </button>
              {primaryLabel && (
                <button type="button" onClick={primaryAction} className="hidden h-9 shrink-0 items-center gap-2 rounded-lg bg-theme-text-primary px-3.5 text-xs font-semibold text-theme-bg-primary sm:flex">
                  <Plus size={14} weight="bold" />
                  {primaryLabel}
                </button>
              )}
            </div>
            <nav className="mx-auto mt-4 flex max-w-7xl items-center gap-1 overflow-x-auto" aria-label="E-Mail-Bereiche">
              <TabButton id="workflows" current={tab} onClick={setTab} icon={FlowArrow} label="Workflows" count={data.workflows.length} />
              <TabButton id="mailbox" current={tab} onClick={setTab} icon={EnvelopeOpen} label="Postfach" />
              <TabButton id="groups" current={tab} onClick={setTab} icon={Buildings} label="Gruppen" count={data.groups.length} />
              <TabButton id="accounts" current={tab} onClick={setTab} icon={ShieldCheck} label="Konten" count={data.accounts.length} />
            </nav>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
            <div className="mx-auto max-w-7xl">
              {loading ? (
                <LoadingGrid />
              ) : tab === "workflows" ? (
                <WorkflowView
                  workflows={data.workflows}
                  accounts={data.accounts}
                  onCreate={() => openWorkflow()}
                  onEdit={openWorkflow}
                  onDelete={deleteWorkflow}
                  onRefresh={() => refresh(true)}
                />
              ) : tab === "mailbox" ? (
                <MailboxView
                  accounts={data.accounts}
                  groups={data.groups}
                  defaultAccountId={data.defaultAccountId}
                  onOpenAccounts={() => setTab("accounts")}
                />
              ) : tab === "groups" ? (
                <GroupsView
                  groups={data.groups}
                  onCreate={() => {
                    setEditingGroup(null);
                    setGroupOpen(true);
                  }}
                  onEdit={(group) => {
                    setEditingGroup(group);
                    setGroupOpen(true);
                  }}
                  onDelete={deleteGroup}
                />
              ) : (
                <AccountsView
                  accounts={data.accounts}
                  onCreate={() => {
                    setEditingAccount(null);
                    setAccountOpen(true);
                  }}
                  onEdit={(account) => {
                    setEditingAccount(account);
                    setAccountOpen(true);
                  }}
                  onDelete={deleteAccount}
                />
              )}
            </div>
          </div>

          {primaryLabel && (
            <button type="button" onClick={primaryAction} className="fixed bottom-5 right-5 z-20 flex h-12 items-center gap-2 rounded-full bg-theme-text-primary px-5 text-sm font-semibold text-theme-bg-primary shadow-xl sm:hidden">
              <Plus size={16} weight="bold" /> {primaryLabel}
            </button>
          )}
        </div>
      </main>

      <WorkflowModal
        open={workflowOpen}
        workflow={editingWorkflow}
        accounts={data.accounts}
        groups={data.groups}
        toolCategories={data.toolCategories}
        onClose={() => setWorkflowOpen(false)}
        onSave={saveWorkflow}
      />
      <AccountModal
        open={accountOpen}
        account={editingAccount}
        onClose={() => {
          setAccountOpen(false);
          setOpenWorkflowAfterAccount(false);
        }}
        onSave={saveAccount}
      />
      <GroupModal
        open={groupOpen}
        group={editingGroup}
        onClose={() => setGroupOpen(false)}
        onSave={saveGroup}
      />
    </div>
  );
}

function TabButton({ id, current, onClick, icon: Icon, label, count }: { id: TabId; current: TabId; onClick: (id: TabId) => void; icon: any; label: string; count?: number }) {
  const active = current === id;
  return (
    <button type="button" onClick={() => onClick(id)} className={`flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-xs font-medium transition-colors ${active ? "bg-theme-bg-secondary text-theme-text-primary" : "text-theme-text-secondary hover:bg-theme-bg-secondary hover:text-theme-text-primary"}`}>
      <Icon size={15} weight={active ? "fill" : "regular"} />
      {label}
      {typeof count === "number" && count > 0 && <span className="rounded-full bg-theme-bg-tertiary px-1.5 py-0.5 text-[9px]">{count}</span>}
    </button>
  );
}

function WorkflowView({ workflows, accounts, onCreate, onEdit, onDelete, onRefresh }: { workflows: EmailWorkflow[]; accounts: EmailAccount[]; onCreate: () => void; onEdit: (workflow: EmailWorkflow) => void; onDelete: (workflow: EmailWorkflow) => void; onRefresh: () => Promise<void> }) {
  const [busy, setBusy] = useState<number | null>(null);
  const accountMap = useMemo(() => new Map(accounts.map((account) => [account.id, account.label])), [accounts]);

  async function action(workflow: EmailWorkflow, type: "toggle" | "trigger") {
    setBusy(workflow.id);
    try {
      const result = await EmailAutomation.workflowAction(workflow.id, type);
      showToast(type === "trigger" ? (result.skipped ? "Workflow läuft bereits." : "Workflow wurde gestartet.") : "Workflow-Status geändert.", result.skipped ? "info" : "success", { clear: true });
      await onRefresh();
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), "error", { clear: true });
    } finally {
      setBusy(null);
    }
  }

  if (workflows.length === 0) {
    return (
      <EmptyState
        icon={FlowArrow}
        title="Noch keine E-Mail-Workflows"
        description="Erstelle einen intelligenten Wächter, der mehrere Postfächer prüft, den Inhalt versteht und danach genau die gewünschten Schritte ausführt."
        action="Ersten Workflow bauen"
        onAction={onCreate}
      />
    );
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {workflows.map((workflow) => (
        <article key={workflow.id} className="group rounded-2xl border border-theme-modal-border bg-theme-bg-secondary p-4 transition-colors hover:border-theme-text-muted">
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${workflow.enabled ? "bg-green-500/10 text-green-500" : "bg-theme-bg-tertiary text-theme-text-muted"}`}>
              <FlowArrow size={18} weight={workflow.enabled ? "fill" : "regular"} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-sm font-semibold text-theme-text-primary">{workflow.name}</h2>
                <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${workflow.enabled ? "bg-green-500/10 text-green-500" : "bg-theme-bg-tertiary text-theme-text-muted"}`}>{workflow.enabled ? "Aktiv" : "Pausiert"}</span>
              </div>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-theme-text-secondary">{workflow.instruction || workflow.condition || workflow.subject || workflow.sender || "Prüft neue passende E-Mails"}</p>
            </div>
            <button type="button" onClick={() => onEdit(workflow)} className="flex h-8 w-8 items-center justify-center rounded-lg text-theme-text-secondary opacity-60 hover:bg-theme-bg-tertiary hover:text-theme-text-primary group-hover:opacity-100" aria-label="Bearbeiten"><DotsThree size={18} weight="bold" /></button>
          </div>

          <div className="mt-4 flex flex-wrap gap-1.5">
            <Chip icon={Clock} text={workflow.cadenceLabel || workflow.schedule} />
            <Chip icon={EnvelopeSimple} text={workflow.accountIds.map((id) => accountMap.get(id) || id).join(", ") || "Standardkonto"} />
            {workflow.groupName && <Chip icon={Buildings} text={workflow.groupName} />}
            <Chip icon={ShieldCheck} text={workflow.safetyMode === "automatic" ? "Automatisch" : workflow.safetyMode === "notify" ? "Nur melden" : "Mit Freigabe"} />
          </div>

          <div className="mt-4 rounded-xl border border-theme-modal-border bg-theme-bg-primary p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-theme-text-muted">Aktionen</p>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-theme-text-secondary">{workflow.actions.join(" · ")}</p>
          </div>

          <div className="mt-4 flex items-center gap-2 border-t border-theme-modal-border pt-3">
            <button type="button" disabled={busy === workflow.id} onClick={() => action(workflow, "trigger")} className="flex h-8 items-center gap-1.5 rounded-lg bg-theme-bg-tertiary px-3 text-[11px] font-medium text-theme-text-primary disabled:opacity-40"><PaperPlaneTilt size={13} /> Jetzt prüfen</button>
            <button type="button" disabled={busy === workflow.id} onClick={() => action(workflow, "toggle")} className="h-8 rounded-lg px-3 text-[11px] font-medium text-theme-text-secondary hover:bg-theme-bg-tertiary hover:text-theme-text-primary disabled:opacity-40">{workflow.enabled ? "Pausieren" : "Aktivieren"}</button>
            <button type="button" onClick={() => onDelete(workflow)} className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-theme-text-muted hover:bg-red-500/10 hover:text-red-400" aria-label="Löschen"><Trash size={14} /></button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-theme-text-muted">
            <span>Nächster Lauf: {formatDate(workflow.nextRunAt)}</span>
            {workflow.latestRun && (
              <span className={
                workflow.latestRun.status === "completed"
                  ? "text-green-500"
                  : workflow.latestRun.status === "failed" || workflow.latestRun.status === "timed_out"
                    ? "text-red-400"
                    : "text-theme-text-muted"
              }>
                Letzter Lauf: {workflow.latestRun.status || "unbekannt"} · {formatDate(workflow.latestRun.completedAt || workflow.latestRun.startedAt)}
              </span>
            )}
          </div>
          {workflow.latestRun?.error && (
            <p className="mt-2 line-clamp-2 rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-2 text-[10px] leading-4 text-red-400">
              {workflow.latestRun.error}
            </p>
          )}
        </article>
      ))}
    </div>
  );
}

function matchingGroup(thread: any, groups: EmailGroup[]) {
  const sender = [
    thread.from,
    thread.sender,
    thread.to,
    thread.recipients,
    thread.participants,
  ]
    .flat()
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return (
    groups.find(
      (group) =>
        group.emails.some((email) => sender.includes(email.toLowerCase())) ||
        group.domains.some((domain) =>
          sender.includes(`@${domain.toLowerCase().replace(/^@/, "")}`),
        ),
    ) || null
  );
}

function MailboxView({ accounts, groups, defaultAccountId, onOpenAccounts }: { accounts: EmailAccount[]; groups: EmailGroup[]; defaultAccountId: string; onOpenAccounts: () => void }) {
  const [accountId, setAccountId] = useState(
    accounts.length > 1 ? "all" : defaultAccountId || accounts[0]?.id || "",
  );
  const [query, setQuery] = useState("is:inbox");
  const [groupFilter, setGroupFilter] = useState("");
  const [threads, setThreads] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!accountId && accounts[0]) {
      setAccountId(accounts.length > 1 ? "all" : accounts[0].id);
    }
  }, [accountId, accounts]);

  const load = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    setError("");
    try {
      if (accountId === "all") {
        const results = await Promise.allSettled(
          accounts.map(async (account) => {
            const result = await EmailAutomation.inbox(
              account.id,
              query || "is:inbox",
              40,
            );
            return (result.data?.threads || []).map((thread: any) => {
              const group = matchingGroup(thread, groups);
              return {
                ...thread,
                _accountId: account.id,
                _accountLabel: account.label,
                _groupId: group?.id || null,
                _groupName: group?.name || null,
              };
            });
          }),
        );
        const failedAccounts = results.filter(
          (result) => result.status === "rejected",
        ).length;
        if (failedAccounts > 0) {
          setError(
            `${failedAccounts} Konto${failedAccounts === 1 ? " konnte" : "en konnten"} nicht geladen werden. Die übrigen Konten werden trotzdem angezeigt.`,
          );
        }
        setThreads(
          results
            .flatMap((result) =>
              result.status === "fulfilled" ? result.value : [],
            )
            .sort(
              (left: any, right: any) =>
                new Date(right.lastMessageDate || 0).getTime() -
                new Date(left.lastMessageDate || 0).getTime(),
            ),
        );
      } else {
        const account = accounts.find((item) => item.id === accountId);
        const result = await EmailAutomation.inbox(
          accountId,
          query || "is:inbox",
          40,
        );
        setThreads(
          (result.data?.threads || []).map((thread: any) => {
            const group = matchingGroup(thread, groups);
            return {
              ...thread,
              _accountId: accountId,
              _accountLabel: account?.label || accountId,
              _groupId: group?.id || null,
              _groupName: group?.name || null,
            };
          }),
        );
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setThreads([]);
    } finally {
      setLoading(false);
    }
  }, [accountId, accounts, groups, query]);

  useEffect(() => {
    void load();
  }, [load]);

  async function openThread(thread: any) {
    setSelected({ ...thread, loading: true });
    try {
      const sourceAccountId = thread._accountId || accountId;
      const result = await EmailAutomation.readThread(thread.id, sourceAccountId);
      setSelected({
        ...(result.data || thread),
        _accountId: sourceAccountId,
        _accountLabel: thread._accountLabel,
      });
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : String(cause), "error", { clear: true });
      setSelected(thread);
    }
  }

  const visibleThreads = useMemo(
    () =>
      groupFilter
        ? threads.filter((thread) => thread._groupId === groupFilter)
        : threads,
    [groupFilter, threads],
  );

  if (accounts.length === 0) {
    return <EmptyState icon={EnvelopeSimple} title="Noch kein Gmail-Konto verbunden" description="Verbinde zuerst mindestens ein Konto. Danach kannst du alle Konten in einer gemeinsamen Postfachansicht durchsuchen." action="Zu Konten wechseln" onAction={onOpenAccounts} />;
  }

  return (
    <div className="grid min-h-[560px] overflow-hidden rounded-2xl border border-theme-modal-border bg-theme-bg-secondary lg:grid-cols-[minmax(360px,0.9fr)_1.1fr]">
      <section className="min-w-0 border-b border-theme-modal-border lg:border-b-0 lg:border-r">
        <div className="border-b border-theme-modal-border p-3">
          <div className="flex flex-wrap items-center gap-2">
            <select value={accountId} onChange={(event) => setAccountId(event.target.value)} className="h-9 max-w-52 rounded-lg border border-theme-modal-border bg-theme-bg-primary px-2.5 text-xs text-theme-text-primary outline-none">
              {accounts.length > 1 && <option value="all">Alle Konten</option>}
              {accounts.map((account) => <option key={account.id} value={account.id}>{account.label}</option>)}
            </select>
            {groups.length > 0 && (
              <select value={groupFilter} onChange={(event) => setGroupFilter(event.target.value)} className="h-9 max-w-44 rounded-lg border border-theme-modal-border bg-theme-bg-primary px-2.5 text-xs text-theme-text-primary outline-none">
                <option value="">Alle Gruppen</option>
                {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
              </select>
            )}
            <form onSubmit={(event) => { event.preventDefault(); void load(); }} className="relative min-w-48 flex-1">
              <MagnifyingGlass size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-theme-text-muted" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Gmail-Suche …" className="h-9 w-full rounded-lg border border-theme-modal-border bg-theme-bg-primary pl-8 pr-3 text-xs text-theme-text-primary outline-none" />
            </form>
            <button type="button" onClick={load} className="flex h-9 w-9 items-center justify-center rounded-lg text-theme-text-secondary hover:bg-theme-bg-tertiary"><ArrowClockwise size={15} className={loading ? "animate-spin" : ""} /></button>
          </div>
          <div className="mt-2 flex items-center gap-1 overflow-x-auto">
            {[
              ["is:inbox", "Eingang"],
              ["in:sent", "Gesendet"],
              ["in:drafts", "Entwürfe"],
              ["in:anywhere -in:spam -in:trash", "Alle E-Mails"],
            ].map(([search, label]) => (
              <button
                key={search}
                type="button"
                onClick={() => setQuery(search)}
                className={`h-7 shrink-0 rounded-full px-2.5 text-[10px] font-medium ${
                  query === search
                    ? "bg-theme-bg-tertiary text-theme-text-primary"
                    : "text-theme-text-secondary hover:bg-theme-bg-tertiary hover:text-theme-text-primary"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="max-h-[650px] overflow-y-auto">
          {loading && visibleThreads.length === 0 ? (
            <div className="p-8 text-center text-xs text-theme-text-secondary">Postfach wird geladen …</div>
          ) : error && visibleThreads.length === 0 ? (
            <div className="m-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">{error}</div>
          ) : visibleThreads.length === 0 ? (
            <div className="p-8 text-center text-xs text-theme-text-secondary">Keine passenden E-Mails gefunden.</div>
          ) : (
            <>
              {error && (
                <div className="m-3 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[10px] text-amber-500">
                  {error}
                </div>
              )}
              {visibleThreads.map((thread) => (
                <button key={`${thread._accountId || accountId}:${thread.id}`} type="button" onClick={() => openThread(thread)} className={`flex w-full items-start gap-3 border-b border-theme-modal-border px-4 py-3 text-left hover:bg-theme-bg-tertiary ${selected?.id === thread.id && selected?._accountId === thread._accountId ? "bg-theme-bg-tertiary" : ""}`}>
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${thread.isUnread ? "bg-blue-500" : "bg-theme-bg-tertiary"}`} />
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-sm text-theme-text-primary ${thread.isUnread ? "font-semibold" : "font-medium"}`}>{thread.subject || "(Kein Betreff)"}</span>
                    <span className="mt-1 flex min-w-0 items-center gap-1.5 text-[11px] text-theme-text-secondary">
                      <span className="truncate">{thread.from || thread.sender || `${thread.messageCount || 1} Nachricht(en)`}</span>
                      {accountId === "all" && (
                        <span className="shrink-0 rounded-full bg-theme-bg-primary px-1.5 py-0.5 text-[8px] text-theme-text-muted">
                          {thread._accountLabel}
                        </span>
                      )}
                      {thread._groupName && (
                        <span className="shrink-0 rounded-full border border-theme-modal-border bg-theme-bg-primary px-1.5 py-0.5 text-[8px] text-theme-text-muted">
                          {thread._groupName}
                        </span>
                      )}
                    </span>
                    {thread.snippet && <span className="mt-1 block line-clamp-2 text-[10px] leading-4 text-theme-text-muted">{thread.snippet}</span>}
                  </span>
                  <span className="shrink-0 text-[9px] text-theme-text-muted">{formatDate(thread.lastMessageDate)}</span>
                </button>
              ))}
            </>
          )}
        </div>
      </section>
      <section className="min-w-0 bg-theme-bg-primary">
        {!selected ? (
          <div className="flex h-full min-h-80 flex-col items-center justify-center px-6 text-center">
            <EnvelopeOpen size={32} className="text-theme-text-muted" />
            <p className="mt-3 text-sm font-medium text-theme-text-primary">E-Mail auswählen</p>
            <p className="mt-1 max-w-sm text-xs leading-5 text-theme-text-secondary">Hier erscheint der vollständige Thread. Workflows können ihn inhaltlich bewerten und Folgeaktionen ausführen.</p>
          </div>
        ) : selected.loading ? (
          <div className="flex h-full items-center justify-center text-xs text-theme-text-secondary">Thread wird geladen …</div>
        ) : (
          <ThreadPreview thread={selected} />
        )}
      </section>
    </div>
  );
}

function ThreadPreview({ thread }: { thread: any }) {
  return (
    <div className="max-h-[700px] overflow-y-auto p-5 sm:p-6">
      <div className="border-b border-theme-modal-border pb-4">
        <h2 className="text-lg font-semibold text-theme-text-primary">{thread.subject || "(Kein Betreff)"}</h2>
        <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-theme-text-secondary">
          <span>{thread.messageCount || thread.messages?.length || 1} Nachricht(en)</span>
          {thread._accountLabel && <span className="rounded-full bg-theme-bg-secondary px-2 py-0.5">Konto: {thread._accountLabel}</span>}
          {thread._groupName && <span className="rounded-full bg-theme-bg-secondary px-2 py-0.5">Gruppe: {thread._groupName}</span>}
          {Array.isArray(thread.labels) && thread.labels.map((label: string) => <span key={label} className="rounded-full bg-theme-bg-secondary px-2 py-0.5">{label}</span>)}
        </div>
      </div>
      <div className="space-y-3 pt-4">
        {(thread.messages || [thread]).map((message: any, index: number) => (
          <article key={message.id || index} className="rounded-xl border border-theme-modal-border bg-theme-bg-secondary p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-theme-bg-tertiary text-xs font-semibold text-theme-text-primary">{String(message.from || "E").charAt(0).toUpperCase()}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-theme-text-primary">{message.from || "Unbekannter Absender"}</p>
                <p className="mt-0.5 truncate text-[10px] text-theme-text-muted">An: {message.to || "—"}</p>
              </div>
              <span className="text-[9px] text-theme-text-muted">{formatDate(message.date)}</span>
            </div>
            <div className="mt-4 whitespace-pre-wrap text-xs leading-6 text-theme-text-secondary">{message.body || message.snippet || "Kein Textinhalt verfügbar."}</div>
            {message.attachments?.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{message.attachments.map((attachment: any) => <span key={attachment.name} className="rounded-lg border border-theme-modal-border bg-theme-bg-primary px-2.5 py-1.5 text-[10px] text-theme-text-secondary">{attachment.name}</span>)}</div>}
          </article>
        ))}
      </div>
    </div>
  );
}

function GroupsView({ groups, onCreate, onEdit, onDelete }: { groups: EmailGroup[]; onCreate: () => void; onEdit: (group: EmailGroup) => void; onDelete: (group: EmailGroup) => void }) {
  if (groups.length === 0) return <EmptyState icon={Buildings} title="Noch keine Gruppen" description="Lege Organisationen wie Hausverwaltung, Jobcenter, Kunden oder Lieferanten an. Mehrere Mitarbeiter und Domains werden dann als ein gemeinsamer Akteur verstanden." action="Erste Gruppe anlegen" onAction={onCreate} />;
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {groups.map((group) => (
        <article key={group.id} className="rounded-2xl border border-theme-modal-border bg-theme-bg-secondary p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-theme-bg-tertiary"><Buildings size={17} /></div>
            <div className="min-w-0 flex-1"><h2 className="truncate text-sm font-semibold text-theme-text-primary">{group.name}</h2><p className="mt-1 line-clamp-2 text-[11px] leading-5 text-theme-text-secondary">{group.description || "Gemeinsamer E-Mail-Kontext"}</p></div>
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {group.emails.slice(0, 4).map((email) => <span key={email} className="max-w-full truncate rounded-full border border-theme-modal-border bg-theme-bg-primary px-2 py-1 text-[9px] text-theme-text-secondary">{email}</span>)}
            {group.domains.map((domain) => <span key={domain} className="rounded-full border border-theme-modal-border bg-theme-bg-primary px-2 py-1 text-[9px] text-theme-text-secondary">@{domain}</span>)}
          </div>
          <div className="mt-4 flex items-center gap-2 border-t border-theme-modal-border pt-3">
            <span className="text-[10px] text-theme-text-muted">{group.emails.length} Kontakte · {group.domains.length} Domains</span>
            <button type="button" onClick={() => onEdit(group)} className="ml-auto h-8 rounded-lg px-2.5 text-[10px] text-theme-text-secondary hover:bg-theme-bg-tertiary">Bearbeiten</button>
            <button type="button" onClick={() => onDelete(group)} className="flex h-8 w-8 items-center justify-center rounded-lg text-theme-text-muted hover:bg-red-500/10 hover:text-red-400"><Trash size={13} /></button>
          </div>
        </article>
      ))}
    </div>
  );
}

function AccountsView({ accounts, onCreate, onEdit, onDelete }: { accounts: EmailAccount[]; onCreate: () => void; onEdit: (account: EmailAccount) => void; onDelete: (account: EmailAccount) => void }) {
  const [testing, setTesting] = useState<string | null>(null);
  async function test(account: EmailAccount) {
    setTesting(account.id);
    try {
      await EmailAutomation.testAccount(account.id);
      showToast(`${account.label}: Verbindung funktioniert.`, "success", { clear: true });
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), "error", { clear: true });
    } finally {
      setTesting(null);
    }
  }
  if (accounts.length === 0) return <EmptyState icon={ShieldCheck} title="Mehrere Gmail-Konten verbinden" description="Füge Privat-, Firmen-, Support- und Projektkonten hinzu. Jeder Workflow kann ein Konto, mehrere Konten oder später eine Kontogruppe überwachen." action="Erstes Konto verbinden" onAction={onCreate} />;
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {accounts.map((account) => (
        <article key={account.id} className="rounded-2xl border border-theme-modal-border bg-theme-bg-secondary p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-theme-bg-tertiary text-theme-text-primary"><EnvelopeSimple size={19} weight="fill" /></div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2"><h2 className="truncate text-sm font-semibold text-theme-text-primary">{account.label}</h2>{account.isDefault && <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[9px] text-blue-400">Standard</span>}</div>
              <p className="mt-1 truncate text-[11px] text-theme-text-secondary">{account.email || account.id}</p>
            </div>
            <CheckCircle size={16} weight="fill" className="text-green-500" />
          </div>
          <div className="mt-4 rounded-xl border border-theme-modal-border bg-theme-bg-primary p-3">
            <p className="text-[10px] text-theme-text-muted">Bridge</p>
            <p className="mt-1 truncate font-mono text-[10px] text-theme-text-secondary">{account.deploymentId}</p>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <button type="button" disabled={testing === account.id} onClick={() => test(account)} className="h-8 rounded-lg bg-theme-bg-tertiary px-3 text-[10px] font-medium text-theme-text-primary disabled:opacity-40">{testing === account.id ? "Prüft …" : "Verbindung testen"}</button>
            <button type="button" onClick={() => onEdit(account)} className="ml-auto h-8 rounded-lg px-2.5 text-[10px] text-theme-text-secondary hover:bg-theme-bg-tertiary">Bearbeiten</button>
            <button type="button" onClick={() => onDelete(account)} className="flex h-8 w-8 items-center justify-center rounded-lg text-theme-text-muted hover:bg-red-500/10 hover:text-red-400"><Trash size={13} /></button>
          </div>
        </article>
      ))}
    </div>
  );
}

function EmptyState({ icon: Icon, title, description, action, onAction }: { icon: any; title: string; description: string; action: string; onAction: () => void }) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-theme-modal-border bg-theme-bg-secondary px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-theme-modal-border bg-theme-bg-primary"><Icon size={25} className="text-theme-text-secondary" /></div>
      <h2 className="mt-5 text-base font-semibold text-theme-text-primary">{title}</h2>
      <p className="mt-2 max-w-lg text-xs leading-6 text-theme-text-secondary">{description}</p>
      <button type="button" onClick={onAction} className="mt-5 flex h-9 items-center gap-2 rounded-lg bg-theme-text-primary px-4 text-xs font-semibold text-theme-bg-primary"><Plus size={14} weight="bold" />{action}</button>
    </div>
  );
}

function Chip({ icon: Icon, text }: { icon: any; text: string }) {
  return <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-theme-modal-border bg-theme-bg-primary px-2 py-1 text-[9px] text-theme-text-secondary"><Icon size={11} /><span className="truncate">{text}</span></span>;
}

function LoadingGrid() {
  return <div className="grid gap-3 lg:grid-cols-2">{[0, 1, 2, 3].map((item) => <div key={item} className="h-64 animate-pulse rounded-2xl border border-theme-modal-border bg-theme-bg-secondary" />)}</div>;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "short", timeStyle: "short" }).format(date);
}
