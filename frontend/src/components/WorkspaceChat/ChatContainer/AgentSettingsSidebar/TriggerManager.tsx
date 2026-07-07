// SPDX-License-Identifier: MIT
// Purpose: Trigger management panel for the right sidebar "Agent Settings" tab.
//          Shows list of triggers with create/edit/delete/toggle/fire actions.
//          Replaces the AgentSettingsSidebar placeholder.
import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useTriggers, AgentTrigger } from "@/hooks/useTriggers";
import {
  Plus,
  Clock,
  ArrowsClockwise,
  Play,
  Pause,
  Trash,
  Pencil,
  CheckCircle,
  XCircle,
  CircleNotch,
} from "@phosphor-icons/react";
import showToast from "@/utils/toast";

const STATUS_ICONS: Record<string, React.ReactNode> = {
  done: <CheckCircle size={12} className="text-green-500" />,
  error: <XCircle size={12} className="text-red-500" />,
  running: <CircleNotch size={12} className="animate-spin text-[#009ee0]" />,
  queued: <span className="text-xs text-zinc-400">…</span>,
  failed_permanent: <XCircle size={12} className="text-red-600" weight="fill" />,
};

function TriggerRow({
  trigger,
  onToggle,
  onFire,
  onDelete,
}: {
  trigger: AgentTrigger;
  onToggle: (id: string, active: boolean) => void;
  onFire: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const { t } = useTranslation();
  const typeIcon = trigger.type === "schedule" ? <Clock size={14} /> : <ArrowsClockwise size={14} />;

  return (
    <div className="flex flex-col gap-1 p-2 rounded-lg hover:bg-zinc-800/50 light:hover:bg-slate-100/50 group">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          {typeIcon}
          <span className="text-sm text-theme-text-primary truncate">{trigger.name}</span>
          {!trigger.active && (
            <span className="text-[10px] text-amber-400">paused</span>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onFire(trigger.id)}
            className="text-theme-text-secondary hover:text-[#009ee0]"
            title="Jetzt ausführen"
          >
            <Play size={14} weight="fill" />
          </button>
          <button
            onClick={() => onToggle(trigger.id, !trigger.active)}
            className="text-theme-text-secondary hover:text-amber-400"
            title={trigger.active ? "Pausieren" : "Aktivieren"}
          >
            {trigger.active ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button
            onClick={() => onDelete(trigger.id)}
            className="text-theme-text-secondary hover:text-red-400"
            title="Löschen"
          >
            <Trash size={14} />
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2 text-[10px] text-theme-text-secondary">
        <span>{trigger.agent_name}</span>
        {trigger.config.cron_expression && (
          <span className="font-mono">{trigger.config.cron_expression}</span>
        )}
        {trigger.next_run_at && (
          <span>→ {new Date(trigger.next_run_at).toLocaleString("de-DE")}</span>
        )}
      </div>
    </div>
  );
}

function CreateTriggerForm({
  onCreate,
}: {
  onCreate: (data: Partial<AgentTrigger>) => Promise<boolean>;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [agentName, setAgentName] = useState("");
  const [type, setType] = useState<"schedule" | "polling">("schedule");
  const [cronExpression, setCronExpression] = useState("0 9 * * 1-5");
  const [prompt, setPrompt] = useState("");

  const submit = useCallback(async () => {
    if (!name || !agentName) {
      showToast("Name und Agent erforderlich", "error");
      return;
    }
    const ok = await onCreate({
      name,
      agentName,
      type,
      config: {
        cron_expression: type === "schedule" ? cronExpression : undefined,
        prompt,
        poll_interval_ms: type === "polling" ? 300_000 : undefined,
      },
    } as any);
    if (ok) {
      showToast("Trigger erstellt", "success");
      setOpen(false);
      setName("");
      setPrompt("");
    }
  }, [name, agentName, type, cronExpression, prompt, onCreate]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 px-3 py-1.5 bg-[#009ee0]/10 text-[#009ee0] rounded-lg text-xs hover:bg-[#009ee0]/20"
      >
        <Plus size={14} weight="bold" />
        {t("triggers.create", "Trigger erstellen")}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-3 rounded-lg bg-zinc-800/50 light:bg-slate-100/50">
      <input
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="px-2 py-1 text-sm rounded bg-zinc-900 light:bg-white border border-zinc-700 light:border-slate-300 text-theme-text-primary"
      />
      <input
        placeholder="Agent Name"
        value={agentName}
        onChange={(e) => setAgentName(e.target.value)}
        className="px-2 py-1 text-sm rounded bg-zinc-900 light:bg-white border border-zinc-700 light:border-slate-300 text-theme-text-primary"
      />
      <div className="flex gap-2">
        <button
          onClick={() => setType("schedule")}
          className={`px-2 py-1 text-xs rounded ${type === "schedule" ? "bg-[#009ee0] text-white" : "bg-zinc-700 text-zinc-300"}`}
        >
          Schedule
        </button>
        <button
          onClick={() => setType("polling")}
          className={`px-2 py-1 text-xs rounded ${type === "polling" ? "bg-[#009ee0] text-white" : "bg-zinc-700 text-zinc-300"}`}
        >
          Polling
        </button>
      </div>
      {type === "schedule" && (
        <input
          placeholder="Cron: 0 9 * * 1-5"
          value={cronExpression}
          onChange={(e) => setCronExpression(e.target.value)}
          className="px-2 py-1 text-sm font-mono rounded bg-zinc-900 light:bg-white border border-zinc-700 light:border-slate-300 text-theme-text-primary"
        />
      )}
      <textarea
        placeholder="Prompt für den Agent"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={2}
        className="px-2 py-1 text-sm rounded bg-zinc-900 light:bg-white border border-zinc-700 light:border-slate-300 text-theme-text-primary"
      />
      <div className="flex gap-2">
        <button
          onClick={submit}
          className="px-3 py-1 bg-[#009ee0] text-white rounded text-xs"
        >
          {t("common.save", "Speichern")}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="px-3 py-1 text-zinc-400 text-xs"
        >
          {t("common.cancel", "Abbrechen")}
        </button>
      </div>
    </div>
  );
}

export default function TriggerManager({ workspaceSlug }: { workspaceSlug: string }) {
  const { t } = useTranslation();
  const { triggers, loading, create, toggle, fire, remove } = useTriggers(workspaceSlug);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-theme-text-secondary">
          {t("triggers.title", "Trigger")}
        </h4>
        <CreateTriggerForm onCreate={create} />
      </div>

      {loading ? (
        <p className="text-xs text-theme-text-secondary text-center py-2">
          {t("common.loading", "Lädt…")}
        </p>
      ) : triggers.length === 0 ? (
        <p className="text-xs text-theme-text-secondary text-center py-2">
          {t("triggers.none", "Keine Trigger konfiguriert.")}
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          {triggers.map((tr) => (
            <TriggerRow
              key={tr.id}
              trigger={tr}
              onToggle={toggle}
              onFire={fire}
              onDelete={remove}
            />
          ))}
        </div>
      )}
    </div>
  );
}
