// SPDX-License-Identifier: MIT
import { memo } from "react";
import { useTranslation } from "react-i18next";
import { Sparkle } from "@phosphor-icons/react/dist/csr/Sparkle";
import { Books } from "@phosphor-icons/react/dist/csr/Books";
import { Notepad } from "@phosphor-icons/react/dist/csr/Notepad";
import { Database } from "@phosphor-icons/react/dist/csr/Database";

function CapabilityCard({ icon: Icon, title, description, onClick }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col gap-2 p-4 rounded-xl border border-theme-border bg-zinc-800/50 light:bg-slate-50 hover:bg-zinc-800 light:hover:bg-slate-100 transition-all text-left"
    >
      <div className="w-8 h-8 rounded-lg bg-theme-accent/20 flex items-center justify-center flex-shrink-0">
        <Icon size={16} className="text-theme-accent" />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-white light:text-slate-900">{title}</span>
        <span className="text-xs text-zinc-400 light:text-slate-500">{description}</span>
      </div>
    </button>
  );
}

function GroundingIndicator({ sources = [] }: { sources?: any[] }) {
  const { t } = useTranslation();
  if (!sources || sources.length === 0) return null;

  const uniqueSources = new Set(
    sources.map((s: any) => s?.title || s?.name || s?.location || JSON.stringify(s)),
  );
  const count = uniqueSources.size;

  if (count === 0) return null;

  return (
    <div className="flex items-center gap-x-1.5 mt-1 mb-1">
      <span
        className="inline-flex items-center gap-x-1 px-2 py-0.5 rounded-full text-xs font-medium bg-theme-bg-secondary text-theme-text-secondary border border-theme-border"
        title={t("chat.grounding.tooltip", "Antwort basiert auf hochgeladenen Quellen")}
      >
        <Sparkle size={12} weight="fill" />
        {t("chat.grounding.based_on_sources", {
          count,
          defaultValue: `Basierend auf ${count} ${count === 1 ? "Quelle" : "Quellen"}`,
        })}
      </span>
    </div>
  );
}

export default memo(GroundingIndicator);
