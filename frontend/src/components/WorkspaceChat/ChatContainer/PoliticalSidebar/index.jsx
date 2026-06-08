// SPDX-License-Identifier: MIT
import { useEffect, useRef, useState } from "react";
import {
  X,
  Newspaper,
  FileText,
  ArrowClockwise,
  ArrowSquareOut,
} from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import { API_BASE } from "@/utils/constants";
import { fetchWithTimeout } from "@/utils/fetchWithTimeout";
import ChatSidebar, { usePoliticalSidebar } from "../ChatSidebar";

function Section({ title, loading, error, onRetry, retryLabel, children }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[10px] uppercase tracking-widest text-zinc-500 light:text-slate-400">
        {title}
      </p>
      {loading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-10 rounded-xl bg-zinc-800 animate-pulse" />
          ))}
        </div>
      )}
      {error && (
        <div className="p-2 rounded-lg bg-red-950/40 border border-red-800/50 text-xs text-red-400 flex flex-col gap-2">
          <span>{error}</span>
          {onRetry && (
            <button
              onClick={onRetry}
              type="button"
              className="self-start flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-900/40 hover:bg-red-900/70 text-red-200 border-none cursor-pointer transition-colors"
            >
              <ArrowClockwise size={11} weight="bold" />
              {retryLabel}
            </button>
          )}
        </div>
      )}
      {!loading && !error && children}
    </div>
  );
}

export default function PoliticalSidebar() {
  const { sidebarOpen, closeSidebar } = usePoliticalSidebar();
  const { t } = useTranslation();
  const [drucksachen, setDrucksachen] = useState([]);
  const [rssItems, setRssItems] = useState([]);
  const [loadingDrucksachen, setLoadingDrucksachen] = useState(false);
  const [loadingRss, setLoadingRss] = useState(false);
  const [errorDrucksachen, setErrorDrucksachen] = useState(null);
  const [errorRss, setErrorRss] = useState(null);
  const abortRef = useRef(null);

  function ensureController() {
    if (!abortRef.current || abortRef.current.signal.aborted)
      abortRef.current = new AbortController();
    return abortRef.current;
  }

  async function fetchDrucksachen() {
    const { signal } = ensureController();
    setLoadingDrucksachen(true);
    setErrorDrucksachen(null);
    try {
      const r = await fetchWithTimeout(
        `${API_BASE}/utils/bundestag/drucksachen?rows=6`,
        { signal },
      );
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const json = await r.json();
      setDrucksachen(json?.documents || []);
    } catch (e) {
      if (e.name === "AbortError") return;
      setErrorDrucksachen(e.message);
    } finally {
      if (!signal.aborted) setLoadingDrucksachen(false);
    }
  }

  async function fetchRss() {
    const { signal } = ensureController();
    setLoadingRss(true);
    setErrorRss(null);
    try {
      const r = await fetchWithTimeout(`${API_BASE}/utils/political/rss`, {
        signal,
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const json = await r.json();
      setRssItems(json?.items || []);
    } catch (e) {
      if (e.name === "AbortError") return;
      setErrorRss(e.message);
    } finally {
      if (!signal.aborted) setLoadingRss(false);
    }
  }

  function fetchAll() {
    fetchDrucksachen();
    fetchRss();
  }

  useEffect(() => {
    if (sidebarOpen && drucksachen.length === 0 && rssItems.length === 0) {
      fetchAll();
    }
    return () => abortRef.current?.abort();
  }, [sidebarOpen]);

  return (
    <ChatSidebar isOpen={sidebarOpen}>
      <div
        className="ml-4 w-[350px] bg-zinc-900 light:bg-white light:border-2 light:border-slate-300 md:rounded-[16px] flex flex-col overflow-hidden mt-[72px] max-h-[calc(100%-88px)]"
        
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 pt-4 pb-3 shrink-0 border-b border-zinc-800 light:border-slate-200">
          <Newspaper size={15} className="text-zinc-400 light:text-slate-500" />
          <p className="flex-1 font-medium text-sm text-white light:text-slate-900">
            {t("sidebar.political.title", "Politisches")}
          </p>
          <button
            onClick={fetchAll}
            type="button"
            disabled={loadingDrucksachen || loadingRss}
            className="text-zinc-500 hover:text-white transition-colors border-none bg-transparent cursor-pointer disabled:opacity-40 mr-1"
            aria-label="Aktualisieren"
          >
            <ArrowClockwise
              size={13}
              weight="bold"
              className={loadingDrucksachen || loadingRss ? "animate-spin" : ""}
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
        <div className="flex-1 overflow-y-auto p-4 no-scroll flex flex-col gap-4">
          {/* Drucksachen */}
          <Section
            title={t("sidebar.political.drucksachen", "Bundestag-Drucksachen (AfD)")}
            loading={loadingDrucksachen}
            error={errorDrucksachen}
            onRetry={fetchDrucksachen}
            retryLabel={t("sidebar.retry", "Erneut versuchen")}
          >
            {drucksachen.length === 0 ? (
              <p className="text-xs text-zinc-500 italic">
                {t("sidebar.political.empty", "Keine Drucksachen gefunden.")}
              </p>
            ) : (
              drucksachen.map((d) => (
                <a
                  key={d.id || d.drucksache_url}
                  href={d.drucksache_url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2.5 p-2.5 rounded-xl bg-zinc-800 light:bg-slate-50 border border-zinc-700 light:border-slate-200 hover:border-zinc-500 transition-colors"
                >
                  <FileText
                    size={14}
                    weight="regular"
                    className="text-zinc-400 flex-shrink-0 mt-0.5"
                  />
                  <p className="text-xs text-zinc-200 light:text-slate-800 leading-snug line-clamp-2 flex-1">
                    {d.titel || d.title || "—"}
                  </p>
                  <ArrowSquareOut size={11} className="text-zinc-600 flex-shrink-0 mt-0.5" />
                </a>
              ))
            )}
          </Section>

          {/* RSS */}
          <Section
            title={t("sidebar.political.news", "AfD Pressemitteilungen")}
            loading={loadingRss}
            error={errorRss}
            onRetry={fetchRss}
            retryLabel={t("sidebar.retry", "Erneut versuchen")}
          >
            {rssItems.length === 0 ? (
              <p className="text-xs text-zinc-500 italic">
                {t("sidebar.political.rss_empty", "Keine Pressemitteilungen gefunden.")}
              </p>
            ) : (
              rssItems.map((item, i) => (
                <a
                  key={i}
                  href={item.link || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2.5 p-2.5 rounded-xl bg-zinc-800 light:bg-slate-50 border border-zinc-700 light:border-slate-200 hover:border-zinc-500 transition-colors"
                >
                  <Newspaper
                    size={14}
                    weight="regular"
                    className="text-zinc-400 flex-shrink-0 mt-0.5"
                  />
                  <p className="text-xs text-zinc-200 light:text-slate-800 leading-snug line-clamp-2 flex-1">
                    {item.title}
                  </p>
                  <ArrowSquareOut size={11} className="text-zinc-600 flex-shrink-0 mt-0.5" />
                </a>
              ))
            )}
          </Section>

          <div className="p-3 rounded-xl bg-zinc-800/50 border border-zinc-700">
            <p className="text-[10px] text-zinc-500 leading-relaxed">
              {t(
                "sidebar.political.hint",
                'Tipp: "@agent Bundestag Drucksache..." im Chat für detaillierte Abfragen.',
              )}
            </p>
          </div>
        </div>
      </div>
    </ChatSidebar>
  );
}
