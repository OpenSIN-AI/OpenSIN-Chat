// SPDX-License-Identifier: MIT
// Purpose: Full Workspace Settings panel — LLM Provider, Embedding Engine,
//          Vector DB, and Agent Defaults. Compact sidebar version of the
//          full WorkspaceSettings page.
//          Replaces the Phase 1 placeholder.
// Docs: WorkspaceSettingsSidebar.doc.md
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Gear } from "@phosphor-icons/react/dist/csr/Gear";
import { CaretDown } from "@phosphor-icons/react/dist/csr/CaretDown";
import showToast from "@/utils/toast";

const API_BASE = "/api";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("opensin_chat_auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// --- LLM Provider Selection ---
const LLM_PROVIDERS = [
  { id: "openai", name: "OpenAI" },
  { id: "anthropic", name: "Anthropic" },
  { id: "fireworksai", name: "Fireworks AI" },
  { id: "nvidia-nim", name: "NVIDIA NIM" },
  { id: "opencode-zen", name: "OpenCode Zen" },
  { id: "ollama", name: "Ollama (Local)" },
  { id: "lmstudio", name: "LM Studio (Local)" },
  { id: "groq", name: "Groq" },
  { id: "mistral", name: "Mistral" },
  { id: "gemini", name: "Google Gemini" },
  { id: "xai", name: "xAI Grok" },
];

function LLMProviderSelector({ workspace, onUpdate }: { workspace: any; onUpdate: (d: any) => void }) {
  const { t } = useTranslation();
  const [provider, setProvider] = useState(workspace?.chatProvider || "");
  const [model, setModel] = useState(workspace?.chatModel || "");

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-theme-text-secondary font-medium">
        {t("workspace_settings.llm_provider", "LLM Provider")}
      </label>
      <select
        value={provider}
        onChange={(e) => {
          setProvider(e.target.value);
          onUpdate({ chatProvider: e.target.value });
        }}
        className="px-2 py-1.5 text-sm rounded-lg bg-zinc-800 light:bg-slate-100 border border-zinc-700 light:border-slate-300 text-theme-text-primary"
      >
        <option value="">{t("workspace_settings.provider_default", "System-Default")}</option>
        {LLM_PROVIDERS.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      <input
        value={model}
        onChange={(e) => setModel(e.target.value)}
        onBlur={() => onUpdate({ chatModel: model })}
        placeholder={t("workspace_settings.model_placeholder", "Model-Name (z.B. gpt-4o)")}
        className="px-2 py-1.5 text-xs rounded-lg bg-zinc-800 light:bg-slate-100 border border-zinc-700 light:border-slate-300 text-theme-text-primary"
      />
    </div>
  );
}

// --- Embedding Engine ---
const EMBEDDING_ENGINES = [
  { id: "openai", name: "OpenAI ada-002" },
  { id: "nvidia-nim", name: "NVIDIA NIM" },
  { id: "localai", name: "LocalAI" },
  { id: "ollama", name: "Ollama (Local)" },
];

function EmbeddingSelector({ workspace, onUpdate }: { workspace: any; onUpdate: (d: any) => void }) {
  const { t } = useTranslation();
  const [engine, setEngine] = useState(workspace?.embeddingEngine || "");

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-theme-text-secondary font-medium">
        {t("workspace_settings.embedding", "Embedding-Engine")}
      </label>
      <select
        value={engine}
        onChange={(e) => {
          setEngine(e.target.value);
          onUpdate({ embeddingEngine: e.target.value });
        }}
        className="px-2 py-1.5 text-sm rounded-lg bg-zinc-800 light:bg-slate-100 border border-zinc-700 light:border-slate-300 text-theme-text-primary"
      >
        <option value="">{t("workspace_settings.embedding_default", "System-Default")}</option>
        {EMBEDDING_ENGINES.map((e) => (
          <option key={e.id} value={e.id}>{e.name}</option>
        ))}
      </select>
    </div>
  );
}

// --- Vector DB ---
const VECTOR_DBS = [
  { id: "chroma", name: "ChromaDB (Local)" },
  { id: "pinecone", name: "Pinecone" },
  { id: "weaviate", name: "Weaviate" },
  { id: "qdrant", name: "Qdrant" },
  { id: "milvus", name: "Milvus" },
];

function VectorDBSelector({ workspace, onUpdate }: { workspace: any; onUpdate: (d: any) => void }) {
  const { t } = useTranslation();
  const [db, setDb] = useState(workspace?.vectorDB || "");

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-theme-text-secondary font-medium">
        {t("workspace_settings.vector_db", "Vector-Datenbank")}
      </label>
      <select
        value={db}
        onChange={(e) => {
          setDb(e.target.value);
          onUpdate({ vectorDB: e.target.value });
        }}
        className="px-2 py-1.5 text-sm rounded-lg bg-zinc-800 light:bg-slate-100 border border-zinc-700 light:border-slate-300 text-theme-text-primary"
      >
        <option value="">{t("workspace_settings.vectordb_default", "System-Default")}</option>
        {VECTOR_DBS.map((v) => (
          <option key={v.id} value={v.id}>{v.name}</option>
        ))}
      </select>
    </div>
  );
}

// --- Agent Defaults ---
function AgentDefaults({ workspace, onUpdate }: { workspace: any; onUpdate: (d: any) => void }) {
  const { t } = useTranslation();
  const [maxToolCalls, setMaxToolCalls] = useState(
    workspace?.maxToolCalls?.toString() || process.env.AGENT_MAX_TOOL_CALLS || "10",
  );

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-theme-text-secondary font-medium">
        {t("workspace_settings.max_tool_calls", "Max. Tool-Calls pro Antwort")}
      </label>
      <input
        type="number"
        min={1}
        max={50}
        value={maxToolCalls}
        onChange={(e) => setMaxToolCalls(e.target.value)}
        onBlur={() => onUpdate({ maxToolCalls: parseInt(maxToolCalls) || 10 })}
        className="px-2 py-1.5 text-sm rounded-lg bg-zinc-800 light:bg-slate-100 border border-zinc-700 light:border-slate-300 text-theme-text-primary w-20"
      />
    </div>
  );
}

// --- Main Panel ---
export default function WorkspaceSettingsSidebar({ workspace }: { workspace: any }) {
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
    } catch {}
    setSaving(false);
  }, [workspace?.slug]);

  return (
    <div className="h-full w-[340px] flex flex-col p-3 overflow-y-auto gap-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Gear size={16} className="text-[#009ee0]" />
        <h3 className="text-sm font-bold text-theme-text-primary">
          {t("right_sidebar.workspace_settings_title", "Workspace-Einstellungen")}
        </h3>
        {saving && <span className="text-xs text-zinc-500">…</span>}
      </div>

      {/* LLM Provider */}
      <LLMProviderSelector workspace={workspace} onUpdate={handleUpdate} />

      {/* Embedding */}
      <EmbeddingSelector workspace={workspace} onUpdate={handleUpdate} />

      {/* Vector DB */}
      <VectorDBSelector workspace={workspace} onUpdate={handleUpdate} />

      {/* Divider */}
      <div className="h-px bg-zinc-800 light:bg-slate-200 my-1" />

      {/* Agent Defaults */}
      <AgentDefaults workspace={workspace} onUpdate={handleUpdate} />

      {/* Link to full settings */}
      <a
        href={`/workspace/${workspace?.slug}/settings`}
        className="text-xs text-[#009ee0] hover:underline mt-2"
      >
        {t("workspace_settings.full_settings", "Alle Einstellungen →")}
      </a>
    </div>
  );
}
