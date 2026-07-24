// SPDX-License-Identifier: MIT
// Speeches tab: search results display for Bundestag speeches
import { Microphone } from "@phosphor-icons/react/dist/csr/Microphone";
import { useTranslation } from "react-i18next";

interface SpeechesTabProps {
  speechLoading: boolean;
  speechError: string | null;
  speechResults: any[];
  speechQuery: string;
}

export function SpeechesTab({
  speechLoading,
  speechError,
  speechResults,
  speechQuery,
}: SpeechesTabProps) {
  const { t } = useTranslation();

  return (
    <>
      <p className="text-[10px] uppercase tracking-widest text-zinc-500 light:text-slate-400 mb-1">
        {t("sidebar.database.speechResults", "Reden-Suchergebnisse")}
      </p>

      {speechLoading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="p-3 rounded-xl bg-zinc-800 light:bg-slate-100 animate-pulse space-y-2"
            >
              <div className="h-3 w-24 rounded bg-zinc-700 light:bg-slate-200" />
              <div className="h-2 w-full rounded bg-zinc-700 light:bg-slate-200" />
              <div className="h-2 w-3/4 rounded bg-zinc-700 light:bg-slate-200" />
            </div>
          ))}
        </div>
      )}

      {speechError && (
        <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/50 text-xs text-red-400">
          {speechError}
        </div>
      )}

      {!speechLoading &&
        !speechError &&
        speechResults.length === 0 &&
        speechQuery && (
          <p className="text-xs text-zinc-500 italic">
            {t("sidebar.database.noSpeeches", "Keine Reden gefunden.")}
          </p>
        )}

      {!speechLoading &&
        !speechError &&
        speechResults.length === 0 &&
        !speechQuery && (
          <p className="text-xs text-zinc-500 italic">
            {t(
              "sidebar.database.speechHint",
              "Suche nach einem Thema, um passende Bundestagsreden zu finden.",
            )}
          </p>
        )}

      {speechResults.map((s, i) => (
        <div
          key={s.id || i}
          className="p-3 rounded-xl bg-zinc-800 light:bg-slate-50 border border-zinc-700 light:border-slate-200"
        >
          <div className="flex items-center gap-2 mb-1.5">
            <Microphone size={12} className="text-zinc-400 flex-shrink-0" />
            <p className="text-xs font-medium text-theme-text-primary light:text-theme-text-primary truncate">
              {s.politicianName || s.politician_name || "—"}
            </p>
            {s.party && (
              <span className="text-[10px] text-zinc-500 light:text-slate-400">
                ({s.party})
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-300 light:text-slate-600 leading-snug line-clamp-3">
            {s.text || s.speechText || s.excerpt || "—"}
          </p>
          {s.date && (
            <p className="text-[10px] text-zinc-500 light:text-slate-400 mt-1">
              {s.date}
            </p>
          )}
        </div>
      ))}
    </>
  );
}
