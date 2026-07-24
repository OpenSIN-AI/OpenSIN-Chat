// SPDX-License-Identifier: MIT
// Drucksachen tab: search results display for Bundestag printed matters
import { FileText } from "@phosphor-icons/react/dist/csr/FileText";
import { useTranslation } from "react-i18next";

interface DrucksachenTabProps {
  dipLoading: boolean;
  dipError: string | null;
  dipResults: any[];
  dipQuery: string;
}

export function DrucksachenTab({
  dipLoading,
  dipError,
  dipResults,
  dipQuery,
}: DrucksachenTabProps) {
  const { t } = useTranslation();

  return (
    <>
      <p className="text-[10px] uppercase tracking-widest text-zinc-500 light:text-slate-400 mb-1">
        {t("sidebar.database.dipResults", "Bundestags-Drucksachen")}
      </p>

      {dipLoading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="p-3 rounded-xl bg-zinc-800 light:bg-slate-100 animate-pulse space-y-2"
            >
              <div className="h-3 w-32 rounded bg-zinc-700 light:bg-slate-200" />
              <div className="h-2 w-full rounded bg-zinc-700 light:bg-slate-200" />
              <div className="h-2 w-3/4 rounded bg-zinc-700 light:bg-slate-200" />
            </div>
          ))}
        </div>
      )}

      {dipError && (
        <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/50 text-xs text-red-400 flex flex-col gap-1.5">
          <span>{dipError}</span>
          {/api.?schl|key|KEY/i.test(dipError) && (
            <span className="text-red-300/70">
              Setze{" "}
              <code className="bg-red-900/40 px-1 py-0.5 rounded font-mono">
                BUNDESTAG_DIP_API_KEY
              </code>{" "}
              in der Server-Umgebung.{" "}
              <a
                href="https://dip.bundestag.de/documents/informationsblatt_zur_dip_api_v01.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-red-300/80 hover:text-red-200"
              >
                DIP API-Dokumentation
              </a>
            </span>
          )}
        </div>
      )}

      {!dipLoading && !dipError && dipResults.length === 0 && !dipQuery && (
        <p className="text-xs text-zinc-500 italic">
          {t(
            "sidebar.database.dipHint",
            "Suche nach Bundestags-Drucksachen (Anfragen, Anträge, Berichte).",
          )}
        </p>
      )}

      {!dipLoading && !dipError && dipResults.length === 0 && dipQuery && (
        <p className="text-xs text-zinc-500 italic">
          {t("sidebar.database.noDipResults", "Keine Drucksachen gefunden.")}
        </p>
      )}

      {dipResults.map((doc, i) => (
        <div
          key={doc.id || i}
          className="p-3 rounded-xl bg-zinc-800 light:bg-slate-50 border border-zinc-700 light:border-slate-200"
        >
          <div className="flex items-center gap-2 mb-1.5">
            <FileText size={12} className="text-zinc-400 flex-shrink-0" />
            <p className="text-xs font-medium text-theme-text-primary light:text-theme-text-primary truncate flex-1">
              {doc.titel || doc.title || "—"}
            </p>
          </div>
          <p className="text-xs text-zinc-300 light:text-slate-600 leading-snug line-clamp-3">
            {doc.kurz_beschreibung || doc.abstract || doc.description || "—"}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            {doc.typ && (
              <span className="text-[10px] text-zinc-500 light:text-slate-400 bg-zinc-700/50 light:bg-slate-100 rounded px-1.5 py-0.5">
                {doc.typ}
              </span>
            )}
            {doc.datum && (
              <span className="text-[10px] text-zinc-500 light:text-slate-400">
                {new Date(doc.datum).toLocaleDateString()}
              </span>
            )}
            {doc.drucksachennummer && (
              <span className="text-[10px] text-zinc-500 light:text-slate-400">
                {doc.drucksachennummer}
              </span>
            )}
          </div>
        </div>
      ))}
    </>
  );
}
