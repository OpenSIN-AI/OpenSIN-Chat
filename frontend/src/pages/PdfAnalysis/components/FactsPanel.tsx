// SPDX-License-Identifier: MIT
// Facts panel: search and display extracted facts with source references
import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import PdfAnalysis from "@/models/pdfAnalysis";
import logger from "@/utils/logger";

interface FactSource {
  documentName: string;
  page: number;
  pageCorrected?: boolean;
}

interface Fact {
  id: string;
  detail: string;
  quote?: string;
  source: FactSource;
  verified?: boolean;
  tags?: string[];
  crossCheck?: any;
}

interface FactsPanelProps {
  onCrossCheck?: (factId: string) => void;
}

export function FactsPanel({ onCrossCheck }: FactsPanelProps) {
  const { t, i18n } = useTranslation();
  const [q, setQ] = useState("");
  const [documentFilter, setDocumentFilter] = useState("");
  const [facts, setFacts] = useState<Fact[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async () => {
    setLoading(true);
    try {
      setFacts(
        (await PdfAnalysis.searchFacts({
          q,
          document: documentFilter,
        })) as Fact[],
      );
    } catch (e) {
      logger.error("Failed to search facts:", e);
    } finally {
      setLoading(false);
    }
  }, [q, documentFilter]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    PdfAnalysis.searchFacts({ q, document: documentFilter })
      .then((res) => {
        if (cancelled) return;
        setFacts(res as Fact[]);
      })
      .catch((e) => {
        if (!cancelled) logger.error(e);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          search();
        }}
        className="flex flex-col gap-3 p-4 rounded-lg bg-theme-bg-secondary border border-theme-sidebar-border"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("pdfAnalysis.panel.searchPlaceholder")}
          aria-label={t("pdfAnalysis.panel.searchAria")}
          className="w-full rounded-md bg-theme-bg-container border border-theme-sidebar-border p-2 text-sm text-theme-text-primary placeholder:text-theme-text-secondary focus:outline-none focus:border-theme-text-primary"
        />
        <input
          value={documentFilter}
          onChange={(e) => setDocumentFilter(e.target.value)}
          placeholder={t("pdfAnalysis.panel.documentFilterPlaceholder")}
          aria-label={t("pdfAnalysis.panel.documentFilterAria")}
          className="w-full rounded-md bg-theme-bg-container border border-theme-sidebar-border p-2 text-sm text-theme-text-primary placeholder:text-theme-text-secondary focus:outline-none focus:border-theme-text-primary"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-md text-sm font-medium bg-theme-bg-container text-theme-text-primary border border-theme-sidebar-border hover:bg-theme-bg-secondary transition-colors"
        >
          {t("pdfAnalysis.panel.search")}
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-theme-text-secondary">
          {t("pdfAnalysis.panel.searching")}
        </p>
      ) : facts.length === 0 ? (
        <p className="text-sm text-theme-text-secondary">
          {t("pdfAnalysis.panel.noFacts")}
        </p>
      ) : (
        <ul
          className="flex flex-col gap-3"
          aria-label={t("pdfAnalysis.panel.foundFactsAria")}
        >
          {facts.map((fact) => (
            <li
              key={fact.id}
              className="flex flex-col gap-1 p-4 rounded-lg bg-theme-bg-secondary border border-theme-sidebar-border"
            >
              <p className="text-sm text-theme-text-primary leading-relaxed">
                {fact.detail}
              </p>
              {fact.quote && (
                <blockquote className="text-xs text-theme-text-secondary italic border-l-2 border-theme-sidebar-border pl-2">
                  {`"${fact.quote}"`}
                </blockquote>
              )}
              <div className="flex flex-wrap items-center gap-2 mt-2 min-w-0">
                <span className="text-xs text-theme-text-secondary truncate min-w-0 max-w-full">
                  {t("pdfAnalysis.panel.sourceLabel", {
                    docName: fact.source.documentName,
                    page: fact.source.page,
                  })}
                  {fact.source.pageCorrected && (
                    <span
                      className="ml-1 text-blue-400"
                      title={t("pdfAnalysis.panel.pageCorrectedAria")}
                    >
                      {t("pdfAnalysis.panel.pageCorrected")}
                    </span>
                  )}
                  {fact.verified === true && (
                    <span className="ml-1 text-green-400">
                      {t("pdfAnalysis.panel.verified")}
                    </span>
                  )}
                  {fact.verified === false && (
                    <span className="ml-1 text-yellow-400">
                      {t("pdfAnalysis.panel.notVerified")}
                    </span>
                  )}
                </span>
                {fact.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-0.5 rounded-md bg-theme-bg-container text-theme-text-secondary"
                  >
                    {tag}
                  </span>
                ))}
                {fact.crossCheck && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-md border ${
                      fact.crossCheck.webOverall === "supports"
                        ? "text-green-400 border-green-400/40"
                        : fact.crossCheck.webOverall === "contradicts"
                          ? "text-red-400 border-red-400/40"
                          : "text-yellow-400 border-yellow-400/40"
                    }`}
                    title={t("pdfAnalysis.panel.checkedAt", {
                      date: fact.crossCheck.checkedAt
                        ? new Date(fact.crossCheck.checkedAt).toLocaleString(
                            i18n.language,
                          )
                        : "—",
                    })}
                  >
                    {t("pdfAnalysis.panel.crossChecked")}{" "}
                    {fact.crossCheck.webOverall === "supports"
                      ? t("pdfAnalysis.panel.crossCheckSupports")
                      : fact.crossCheck.webOverall === "contradicts"
                        ? t("pdfAnalysis.panel.crossCheckContradicts")
                        : t("pdfAnalysis.panel.crossCheckInconclusive")}
                  </span>
                )}
                <div className="flex items-center gap-2 ml-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => onCrossCheck?.(fact.id)}
                    className="text-xs px-2 py-0.5 rounded-md text-theme-text-primary border border-theme-sidebar-border hover:opacity-80"
                    aria-label={t("pdfAnalysis.panel.checkSourcesAria", {
                      text: fact.detail.slice(0, 40),
                    })}
                  >
                    {t("pdfAnalysis.panel.checkSources")}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await PdfAnalysis.deleteFact(fact.id);
                        search();
                      } catch (e) {
                        logger.error(e);
                      }
                    }}
                    className="text-xs px-2 py-0.5 rounded-md text-red-400 border border-red-400/40 hover:opacity-80 whitespace-nowrap"
                    aria-label={t("pdfAnalysis.panel.deleteFactAria", {
                      text: fact.detail.slice(0, 40),
                    })}
                  >
                    {t("pdfAnalysis.panel.delete")}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
