// SPDX-License-Identifier: MIT
import { memo } from "react";
import { useTranslation } from "react-i18next";
import { Books } from "@phosphor-icons/react/dist/csr/Books";

function GroundingBadge({ sources = [] }: { sources?: any[] }) {
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
        <Books size={12} weight="fill" />
        {t("chat.grounding.based_on_sources", {
          count,
          defaultValue: `Basierend auf ${count} ${count === 1 ? "Quelle" : "Quellen"}`,
        })}
      </span>
    </div>
  );
}

export default memo(GroundingBadge);
