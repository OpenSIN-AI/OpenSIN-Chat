// SPDX-License-Identifier: MIT
// Politicians tab: list of politicians with selection, add-to-workspace, and profile links
import { Users } from "@phosphor-icons/react/dist/csr/Users";
import { CheckSquare } from "@phosphor-icons/react/dist/csr/CheckSquare";
import { Square } from "@phosphor-icons/react/dist/csr/Square";
import { Plus } from "@phosphor-icons/react/dist/csr/Plus";
import { ArrowSquareOut } from "@phosphor-icons/react/dist/csr/ArrowSquareOut";
import { ArrowClockwise } from "@phosphor-icons/react/dist/csr/ArrowClockwise";
import { useTranslation } from "react-i18next";

interface PoliticiansTabProps {
  politicians: any[];
  loading: boolean;
  error: string | null;
  selected: Set<string>;
  adding: Set<string>;
  workspaceSlug: string | undefined;
  onToggleSelected: (id: string) => void;
  onOpenProfile: (id: string) => void;
  onAddToWorkspace: (id: string) => void;
  onRefresh: () => void;
}

export function PoliticiansTab({
  politicians,
  loading,
  error,
  selected,
  adding,
  workspaceSlug,
  onToggleSelected,
  onOpenProfile,
  onAddToWorkspace,
  onRefresh,
}: PoliticiansTabProps) {
  const { t } = useTranslation();

  return (
    <>
      <p className="text-[10px] uppercase tracking-widest text-zinc-500 light:text-slate-400 mb-1">
        {t("sidebar.database.source", "Quelle: Abgeordnetenwatch API")}
      </p>

      {loading && politicians.length === 0 && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-800 light:bg-slate-100 animate-pulse"
            >
              <div className="w-8 h-8 rounded-full bg-zinc-700 light:bg-slate-200 flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-28 rounded bg-zinc-700 light:bg-slate-200" />
                <div className="h-2 w-20 rounded bg-zinc-700 light:bg-slate-200" />
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/50 text-xs text-red-400 flex flex-col gap-2">
          <span>
            {t("sidebar.database.error", "Fehler beim Laden")}: {error}
          </span>
          <button
            onClick={onRefresh}
            type="button"
            className="self-start flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-900/40 hover:bg-red-900/70 text-red-300 text-xs"
          >
            <ArrowClockwise size={11} weight="bold" />
            {t("sidebar.retry", "Erneut versuchen")}
          </button>
        </div>
      )}

      {!loading && !error && politicians.length === 0 && (
        <p className="text-xs text-zinc-500 italic">
          {t("sidebar.database.empty", "Keine Politiker gefunden.")}
        </p>
      )}

      {politicians.map((p) => {
        const name =
          `${p.first_name || ""} ${p.last_name || ""}`.trim() ||
          p.label ||
          t("common.unknown", "—");
        const constituency =
          p.constituency?.label ||
          p.electoral_data?.constituency?.label ||
          null;
        const profileUrl = p.abgeordnetenwatch_url || null;
        const isSelected = selected.has(p.id);
        const isAdding = adding.has(p.id);
        const separator = t("common.listSeparator", " — ");
        return (
          <div
            key={p.id}
            onClick={() => onOpenProfile(p.id)}
            className={`flex items-center gap-2 p-2.5 rounded-xl border transition-colors cursor-pointer ${
              isSelected
                ? "bg-blue-600/20 border-blue-500/40"
                : "bg-zinc-800 light:bg-slate-50 border-zinc-700 light:border-slate-200 hover:bg-zinc-700/50 light:hover:bg-slate-100"
            }`}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelected(p.id);
              }}
              className="text-zinc-400 light:text-slate-500 hover:text-theme-text-primary light:hover:text-theme-text-primary transition-colors border-none bg-transparent cursor-pointer"
              aria-label={t("sidebar.database.select", "Auswählen")}
            >
              {isSelected ? (
                <CheckSquare
                  size={16}
                  weight="fill"
                  className="text-blue-500"
                />
              ) : (
                <Square size={16} />
              )}
            </button>
            <div className="w-8 h-8 rounded-full bg-zinc-700 light:bg-slate-200 flex items-center justify-center flex-shrink-0">
              <Users size={15} className="text-zinc-400 light:text-slate-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-theme-text-primary light:text-theme-text-primary truncate">
                {name}
              </p>
              <p className="text-[11px] text-zinc-500 light:text-slate-400 truncate">
                {[p.party?.label, p.state, constituency]
                  .filter(Boolean)
                  .join(separator) ||
                  t(
                    "sidebar.database.missingAffiliation",
                    "Keine Partei- oder Landesangabe verfügbar",
                  )}
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAddToWorkspace(p.id);
              }}
              disabled={isAdding || !workspaceSlug}
              className="text-zinc-500 hover:text-blue-400 disabled:opacity-40 transition-colors border-none bg-transparent cursor-pointer"
              aria-label={t(
                "sidebar.database.addToWorkspace",
                "Zur Quelle hinzufügen",
              )}
              title={t(
                "sidebar.database.addToWorkspace",
                "Zur Quelle hinzufügen",
              )}
            >
              <Plus
                size={16}
                weight={isAdding ? "bold" : "regular"}
                className={isAdding ? "animate-pulse" : ""}
              />
            </button>
            {profileUrl && (
              <a
                href={profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-600 hover:text-zinc-300 transition-colors flex-shrink-0"
                aria-label={t("sidebar.database.openProfile", "Profil öffnen")}
                title={t("sidebar.database.openProfile", "Profil öffnen")}
              >
                <ArrowSquareOut size={13} />
              </a>
            )}
          </div>
        );
      })}

      <div className="mt-3 p-3 rounded-xl bg-zinc-800/50 light:bg-slate-100 border border-zinc-700 light:border-slate-200">
        <p className="text-[10px] text-zinc-500 light:text-slate-500 leading-relaxed">
          {t(
            "sidebar.database.hint",
            "Nutze @agent im Chat, um gezielt nach Politikern oder deren Reden zu recherchieren.",
          )}
        </p>
      </div>
    </>
  );
}
