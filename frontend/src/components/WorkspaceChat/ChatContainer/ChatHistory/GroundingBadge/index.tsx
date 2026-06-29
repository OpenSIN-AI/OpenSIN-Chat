// SPDX-License-Identifier: MIT
import { memo } from "react";
import { useTranslation } from "react-i18next";
import { Sparkle } from "@phosphor-icons/react/dist/csr/Sparkle";

function GroundingIndicator({ sources = [] }: { sources?: any[] }) {
  const { t } = useTranslation();
  if (!sources || sources.length === 0) return null;

  const uniqueSources = new Set(
    sources.map(
      (s: any) => s?.title || s?.name || s?.location || JSON.stringify(s),
    ),
  );
  const count = uniqueSources.size;

  if (count === 0) return null;

  return (
    <div className="flex items-center gap-x-1.5 mt-2">
      <span
        className="inline-flex items-center gap-x-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-white/[0.04] light:bg-slate-100 text-zinc-400 light:text-slate-500 border border-white/5 light:border-slate-200"
        title={t(
          "chat.grounding.tooltip",
          "Antwort basiert auf hochgeladenen Quellen",
        )}
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
