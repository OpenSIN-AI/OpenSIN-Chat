// SPDX-License-Identifier: MIT
import { useEffect, useRef, useState } from "react";
import {
  X,
  Database,
  Users,
  ArrowClockwise,
  ArrowSquareOut,
} from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import { API_BASE } from "@/utils/constants";
import { fetchWithTimeout } from "@/utils/fetchWithTimeout";
import ChatSidebar, { useDatabaseSidebar } from "../ChatSidebar";

export default function DatabaseSidebar() {
  const { sidebarOpen, closeSidebar } = useDatabaseSidebar();
  const { t } = useTranslation();
  const [politicians, setPoliticians] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  async function fetchPoliticians() {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithTimeout(
        `${API_BASE}/utils/bundestag/politicians?limit=8`,
        { signal: controller.signal },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setPoliticians(json?.data || []);
    } catch (e) {
      if (e.name === "AbortError") return; // closed/unmounted — ignore
      setError(e.message);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    if (sidebarOpen && politicians.length === 0) fetchPoliticians();
    return () => abortRef.current?.abort();
  }, [sidebarOpen]);

  return (
    <ChatSidebar isOpen={sidebarOpen}>
      <div
        className="ml-4 w-[350px] bg-zinc-900 light:bg-white light:border-2 light:border-slate-300 md:rounded-[16px] flex flex-col overflow-hidden mt-[72px] max-h-[calc(100%-88px)]"
        
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 pt-4 pb-3 shrink-0 border-b border-zinc-800 light:border-slate-200">
          <Database size={15} className="text-zinc-400 light:text-slate-500" />
          <p className="flex-1 font-medium text-sm text-white light:text-slate-900">
            {t("sidebar.database.title", "AfD-Abgeordnete")}
          </p>
          <button
            onClick={fetchPoliticians}
            type="button"
            disabled={loading}
            className="text-zinc-500 hover:text-white transition-colors border-none bg-transparent cursor-pointer disabled:opacity-40 mr-1"
            aria-label="Aktualisieren"
          >
            <ArrowClockwise
              size={13}
              weight="bold"
              className={loading ? "animate-spin" : ""}
            />
          </button>
          <button
            onClick={closeSidebar}
            type="button"
            className="text-white/60 light:text-slate-400 hover:text-white light:hover:text-slate-900 transition-colors border-none bg-transparent cursor-pointer"
          >
            <X size={14} weight="bold" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 no-scroll flex flex-col gap-2">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 light:text-slate-400 mb-1">
            {t("sidebar.database.source", "Quelle: Abgeordnetenwatch API")}
          </p>

          {loading && politicians.length === 0 && (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-800 animate-pulse"
                >
                  <div className="w-8 h-8 rounded-full bg-zinc-700 flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-28 rounded bg-zinc-700" />
                    <div className="h-2 w-20 rounded bg-zinc-700" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/50 text-xs text-red-400 flex flex-col gap-2">
              <span>
                {t("sidebar.database.error", "Fehler:")} {error}
              </span>
              <button
                onClick={fetchPoliticians}
                type="button"
                className="self-start flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-900/40 hover:bg-red-900/70 text-red-200 border-none cursor-pointer transition-colors"
              >
                <ArrowClockwise size={11} weight="bold" />
                {t("sidebar.retry", "Erneut versuchen")}
              </button>
            </div>
          )}

          {!loading && !error && politicians.length === 0 && (
            <p className="text-xs text-zinc-500 italic">
              {t("sidebar.database.empty", "Keine Daten geladen.")}
            </p>
          )}

          {politicians.map((p) => {
            const name = `${p.first_name || ""} ${p.last_name || ""}`.trim() || p.label || "—";
            const constituency = p.constituency?.label || p.electoral_data?.constituency?.label || null;
            const profileUrl = p.abgeordnetenwatch_url || null;
            return (
              <div
                key={p.id}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-800 light:bg-slate-50 border border-zinc-700 light:border-slate-200"
              >
                <div className="w-8 h-8 rounded-full bg-zinc-700 light:bg-slate-200 flex items-center justify-center flex-shrink-0">
                  <Users size={15} className="text-zinc-400 light:text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white light:text-slate-900 truncate">{name}</p>
                  {constituency && (
                    <p className="text-[11px] text-zinc-500 light:text-slate-400 truncate">{constituency}</p>
                  )}
                </div>
                {profileUrl && (
                  <a
                    href={profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-600 hover:text-zinc-300 transition-colors flex-shrink-0"
                    aria-label="Profil öffnen"
                  >
                    <ArrowSquareOut size={13} />
                  </a>
                )}
              </div>
            );
          })}

          <div className="mt-3 p-3 rounded-xl bg-zinc-800/50 border border-zinc-700">
            <p className="text-[10px] text-zinc-500 leading-relaxed">
              {t("sidebar.database.hint", 'Tipp: "@agent Suche AfD Abgeordnete..." im Chat für detaillierte Abfragen.')}
            </p>
          </div>
        </div>
      </div>
    </ChatSidebar>
  );
}
