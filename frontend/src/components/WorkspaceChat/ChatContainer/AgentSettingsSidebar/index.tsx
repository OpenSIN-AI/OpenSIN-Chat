// SPDX-License-Identifier: MIT
// Purpose: Full Agent Settings panel — Model selection, System Prompt editor,
//          Tool/Plugin toggles, and embedded TriggerManager.
//          Replaces the Phase 1 placeholder.
// Docs: AgentSettingsSidebar.doc.md
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Robot } from "@phosphor-icons/react/dist/csr/Robot";
import { CaretDown } from "@phosphor-icons/react/dist/csr/CaretDown";
import { CheckCircle } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { Circle } from "@phosphor-icons/react/dist/csr/Circle";
import TriggerManager from "./TriggerManager";
import showToast from "@/utils/toast";

const API_BASE = "/api";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("opensin_chat_auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// --- Model Selection ---
function ModelSelector({ workspace, onUpdate }: { workspace: any; onUpdate: (data: any) => void }) {
  const { t } = useTranslation();
  const [models, setModels] = useState<string[]>([]);
  const [currentModel, setCurrentModel] = useState(workspace?.agentModel || "");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch available models from system
    fetch(`${API_BASE}/system/env-dump`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((j) => {
        // Try to extract model list from workspace settings
        if (j?.settings?.customModels) {
          setModels(j.settings.customModels.split(",").map((m: string) => m.trim()).filter(Boolean));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleChange = (model: string) => {
    setCurrentModel(model);
    onUpdate({ agentModel: model });
  };

  if (loading) return <p className="text-xs text-zinc-500">Lädt…</p>;

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-theme-text-secondary font-medium">
        {t("agent_settings.model", "Model")}
      </label>
      <select
        value={currentModel}
        onChange={(e) => handleChange(e.target.value)}
        className="px-2 py-1.5 text-sm rounded-lg bg-zinc-800 light:bg-slate-100 border border-zinc-700 light:border-slate-300 text-theme-text-primary"
      >
        <option value="">{t("agent_settings.model_default", "Standard (Workspace-Default)")}</option>
        {models.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
    </div>
  );
}

// --- System Prompt Editor ---
function SystemPromptEditor({ workspace, onUpdate }: { workspace: any; onUpdate: (data: any) => void }) {
  const { t } = useTranslation();
  const [prompt, setPrompt] = useState(workspace?.agentPrompt || "");
  const [expanded, setExpanded] = useState(false);

  const save = useCallback(() => {
    onUpdate({ agentPrompt: prompt });
    showToast(t("agent_settings.prompt_saved", "System-Prompt gespeichert"), "success");
  }, [prompt, onUpdate, t]);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <label className="text-xs text-theme-text-secondary font-medium">
          {t("agent_settings.system_prompt", "System-Prompt")}
        </label>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-theme-text-secondary hover:text-theme-text-primary"
        >
          <CaretDown size={12} className={expanded ? "rotate-180 transition-transform" : "transition-transform"} />
        </button>
      </div>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onBlur={save}
        rows={expanded ? 8 : 3}
        placeholder={t("agent_settings.prompt_placeholder", "Custom System-Prompt für diesen Agent…")}
        className="px-2 py-1.5 text-xs font-mono rounded-lg bg-zinc-800 light:bg-slate-100 border border-zinc-700 light:border-slate-300 text-theme-text-primary resize-y"
      />
    </div>
  );
}

// --- Tool/Plugin Toggles ---
const AVAILABLE_TOOLS = [
  { id: "rag-memory", name: "RAG Memory", defaultEnabled: true },
  { id: "document-summarizer", name: "Dokument-Zusammenfassung", defaultEnabled: true },
  { id: "web-scraping", name: "Web-Scraping", defaultEnabled: true },
  { id: "web-browsing", name: "Web-Browsing", defaultEnabled: false },
  { id: "create-chart", name: "Chart-Generierung", defaultEnabled: false },
  { id: "image-generation", name: "Bild-Generierung", defaultEnabled: false },
  { id: "filesystem-agent", name: "Dateisystem", defaultEnabled: false },
  { id: "create-files-agent", name: "Dateien erstellen", defaultEnabled: false },
  { id: "gmail-agent", name: "Gmail", defaultEnabled: false },
  { id: "google-calendar-agent", name: "Google Calendar", defaultEnabled: false },
  { id: "outlook-agent", name: "Outlook", defaultEnabled: false },
  { id: "sql-agent", name: "SQL", defaultEnabled: false },
  { id: "subagent-spawner", name: "Subagent-Spawning", defaultEnabled: true },
];

function ToolToggles({ workspace, onUpdate }: { workspace: any; onUpdate: (data: any) => void }) {
  const { t } = useTranslation();
  const [enabledTools, setEnabledTools] = useState<string[]>(
    workspace?.agentSkills || AVAILABLE_TOOLS.filter((t) => t.defaultEnabled).map((t) => t.id),
  );

  const toggle = (toolId: string) => {
    const newTools = enabledTools.includes(toolId)
      ? enabledTools.filter((t) => t !== toolId)
      : [...enabledTools, toolId];
    setEnabledTools(newTools);
    onUpdate({ agentSkills: newTools });
  };

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-theme-text-secondary font-medium">
        {t("agent_settings.tools", "Tools & Plugins")}
      </label>
      <div className="flex flex-col gap-0.5 max-h-[200px] overflow-y-auto">
        {AVAILABLE_TOOLS.map((tool) => {
          const enabled = enabledTools.includes(tool.id);
          return (
            <button
              key={tool.id}
              onClick={() => toggle(tool.id)}
              className="flex items-center justify-between py-1 px-2 rounded hover:bg-zinc-800/50 light:hover:bg-slate-100/50 text-left"
            >
              <span className="text-xs text-theme-text-primary">{tool.name}</span>
              {enabled ? (
                <CheckCircle size={14} className="text-green-500" weight="fill" />
              ) : (
                <Circle size={14} className="text-zinc-600" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// --- Main Panel ---
export default function AgentSettingsSidebar({ workspace }: { workspace: any }) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);

  const handleUpdate = useCallback(async (data: any) => {
    setSaving(true);
    try {
      const r = await fetch(`${API_BASE}/workspace/${workspace?.slug}`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const j = await r.json();
      if (!j.success) showToast(j.error || "Speichern fehlgeschlagen", "error");
    } catch {
      // silently fail — workspace update may not support all fields yet
    }
    setSaving(false);
  }, [workspace?.slug]);

  return (
    <div className="h-full w-[340px] flex flex-col p-3 overflow-y-auto gap-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Robot size={16} className="text-[#009ee0]" />
        <h3 className="text-sm font-bold text-theme-text-primary">
          {t("right_sidebar.agent_settings_title", "Agent-Einstellungen")}
        </h3>
        {saving && <span className="text-xs text-zinc-500">…</span>}
      </div>

      {/* Model Selection */}
      <ModelSelector workspace={workspace} onUpdate={handleUpdate} />

      {/* System Prompt */}
      <SystemPromptEditor workspace={workspace} onUpdate={handleUpdate} />

      {/* Tool Toggles */}
      <ToolToggles workspace={workspace} onUpdate={handleUpdate} />

      {/* Divider */}
      <div className="h-px bg-zinc-800 light:bg-slate-200 my-1" />

      {/* Trigger Manager (from Phase 5) */}
      {workspace?.slug && <TriggerManager workspaceSlug={workspace.slug} />}
    </div>
  );
}
