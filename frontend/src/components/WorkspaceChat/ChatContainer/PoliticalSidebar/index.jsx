// SPDX-License-Identifier: MIT
import { useEffect, useState } from "react";
import {
  X,
  Newspaper,
  FileText,
  ArrowClockwise,
  ArrowSquareOut,
} from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import ChatSidebar, { usePoliticalSidebar } from "../ChatSidebar";

function Section({ title, loading, error, children }) {
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
        <div className="p-2 rounded-lg bg-red-950/40 border border-red-800/50 text-xs text-red-400">
          {error}
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

  async function fetchAll() {
    // Drucksachen (Bundestag DIP)
    setLoadingDrucksachen(true);
    setErrorDrucksachen(null);
    fetch("/api/utils/bundestag/drucksachen?rows=6")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => setDrucksachen(json?.documents || []))
      .catch((e) => setErrorDrucksachen(e.message))
      .finally(() => setLoadingDrucksachen(false));

    // RSS
    setLoadingRss(true);
    setErrorRss(null);
    fetch("/api/utils/political/rss")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => setRssItems(json?.items || []))
      .catch((e) => setErrorRss(e.message))
      .finally(() => setLoadingRss(false));
  }

  useEffect(() => {
    if (sidebarOpen && drucksachen.length === 0 && rssItems.length === 0) {
      fetchAll();
    }
  }, [sidebarOpen]);

  return (
    <ChatSidebar isOpen={sidebarOpen}>
      <div
        className="ml-4 w-[350px] bg-zinc-900 light:bg-white light:border-2 light:border-slate-300 md:rounded-[16px] flex flex-col overflow-hidden mt-[72px]"
        style={{ maxHeight: "calc(100% - 88px)" }}
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
