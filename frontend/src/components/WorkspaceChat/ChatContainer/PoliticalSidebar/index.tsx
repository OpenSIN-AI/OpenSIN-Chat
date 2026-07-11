// SPDX-License-Identifier: MIT
import { Newspaper } from "@phosphor-icons/react/dist/csr/Newspaper";
import { FileText } from "@phosphor-icons/react/dist/csr/FileText";
import { ArrowClockwise } from "@phosphor-icons/react/dist/csr/ArrowClockwise";
import { ArrowSquareOut } from "@phosphor-icons/react/dist/csr/ArrowSquareOut";
import { useTranslation } from "react-i18next";
import { usePoliticalData } from "@/hooks/usePoliticalData";
import ChatSidebar, { usePoliticalSidebar } from "../ChatSidebar";
import { PanelHeader } from "@/components/ui/PanelHeader";

function Section({ title, loading, error, onRetry, retryLabel, children }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[10px] uppercase tracking-widest text-theme-text-muted">
        {title}
      </p>
      {loading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-10 rounded-xl bg-theme-bg-tertiary animate-pulse"
            />
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
  const {
    drucksachen,
    rssItems,
    loadingDrucksachen,
    loadingRss,
    errorDrucksachen,
    errorRss,
    refreshDrucksachen,
    refreshRss,
    refreshAll,
  } = usePoliticalData();

  return (
    <ChatSidebar isOpen={sidebarOpen}>
      <div className="w-full h-full bg-theme-bg-sidebar flex flex-col overflow-hidden">
        <PanelHeader
          icon={<Newspaper size={15} weight="fill" />}
          title={t("sidebar.political.title")}
          actions={
            <button
              onClick={refreshAll}
              type="button"
              disabled={loadingDrucksachen || loadingRss}
              className="text-theme-text-muted hover:text-theme-text-primary transition-colors border-none bg-transparent cursor-pointer disabled:opacity-40 p-1"
              aria-label={t("common.refresh")}
            >
              <ArrowClockwise
                size={13}
                weight="bold"
                className={
                  loadingDrucksachen || loadingRss ? "animate-spin" : ""
                }
              />
            </button>
          }
          onClose={closeSidebar}
        />

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 no-scroll flex flex-col gap-4">
          {/* Drucksachen */}
          <Section
            title={t("sidebar.political.drucksachen")}
            loading={loadingDrucksachen}
            error={errorDrucksachen}
            onRetry={refreshDrucksachen}
            retryLabel={t("sidebar.retry")}
          >
            {drucksachen.length === 0 ? (
              <p className="text-xs text-zinc-500 italic">
                {t("sidebar.political.empty")}
              </p>
            ) : (
              drucksachen.map((d) => (
                <a
                  key={d.id || d.drucksache_url}
                  href={d.drucksache_url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2.5 p-2.5 rounded-xl bg-theme-bg-secondary border border-theme-border hover:border-zinc-500 transition-colors"
                >
                  <FileText
                    size={14}
                    weight="regular"
                    className="text-zinc-400 flex-shrink-0 mt-0.5"
                  />
                  <p className="text-xs text-zinc-200 light:text-slate-800 leading-snug line-clamp-2 flex-1">
                    {d.titel || d.title || `—`}
                  </p>
                  <ArrowSquareOut
                    size={11}
                    className="text-zinc-600 flex-shrink-0 mt-0.5"
                  />
                </a>
              ))
            )}
          </Section>

          {/* RSS */}
          <Section
            title={t("sidebar.political.news")}
            loading={loadingRss}
            error={errorRss}
            onRetry={refreshRss}
            retryLabel={t("sidebar.retry")}
          >
            {rssItems.length === 0 ? (
              <p className="text-xs text-zinc-500 italic">
                {t("sidebar.political.rss_empty")}
              </p>
            ) : (
              rssItems.map((item, i) => (
                <a
                  key={item.guid || item.link || i}
                  href={item.link || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2.5 p-2.5 rounded-xl bg-theme-bg-secondary border border-theme-border hover:border-zinc-500 transition-colors"
                >
                  <Newspaper
                    size={14}
                    weight="regular"
                    className="text-zinc-400 flex-shrink-0 mt-0.5"
                  />
                  <p className="text-xs text-zinc-200 light:text-slate-800 leading-snug line-clamp-2 flex-1">
                    {item.title}
                  </p>
                  <ArrowSquareOut
                    size={11}
                    className="text-zinc-600 flex-shrink-0 mt-0.5"
                  />
                </a>
              ))
            )}
          </Section>

          <div className="p-3 rounded-xl bg-theme-bg-tertiary border border-theme-border">
            <p className="text-[10px] text-theme-text-muted leading-relaxed">
              {t("sidebar.political.hint")}
            </p>
          </div>
        </div>
      </div>
    </ChatSidebar>
  );
}
