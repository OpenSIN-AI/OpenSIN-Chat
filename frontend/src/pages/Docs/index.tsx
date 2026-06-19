// SPDX-License-Identifier: MIT
//
// In-app developer documentation rendered at /docs and /docs/:slug.
// Content is curated from the repository's docs/ folder (see docsManifest.ts).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import { ArrowRight } from "@phosphor-icons/react/dist/csr/ArrowRight";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { BookOpen } from "@phosphor-icons/react/dist/csr/BookOpen";
import { List } from "@phosphor-icons/react/dist/csr/List";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { GithubLogo } from "@phosphor-icons/react/dist/csr/GithubLogo";
import paths from "@/utils/paths";
import DocsMarkdown, { type DocHeading } from "./DocsMarkdown";
import DocsToc from "./DocsToc";
import DocsLanding from "./DocsLanding";
import {
  CATEGORY_LABELS,
  getDocBySlug,
  getDocContent,
  getGroupedDocs,
  getAdjacentDocs,
  getEditUrl,
  DOC_ENTRIES,
} from "./docsManifest";
import "./docs.css";

function DocsSidebar({
  activeSlug,
  query,
  setQuery,
  onNavigate,
}: {
  activeSlug: string;
  query: string;
  setQuery: (v: string) => void;
  onNavigate: () => void;
}) {
  const { t } = useTranslation();
  const normalizedQuery = query.trim().toLowerCase();

  const grouped = useMemo(() => {
    const groups = getGroupedDocs();
    if (!normalizedQuery) return groups;
    return groups
      .map((group) => ({
        category: group.category,
        entries: group.entries.filter(
          (entry) =>
            entry.title.toLowerCase().includes(normalizedQuery) ||
            entry.description.toLowerCase().includes(normalizedQuery),
        ),
      }))
      .filter((group) => group.entries.length > 0);
  }, [normalizedQuery]);

  return (
    <nav
      aria-label={t("common.docsNavLabel")}
      className="flex flex-col gap-4 h-full"
    >
      <div className="relative">
        <MagnifyingGlass
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-text-secondary"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("common.docsSearchPlaceholder")}
          aria-label={t("common.docsSearchLabel")}
          className="w-full pl-9 pr-3 py-2 rounded-lg bg-theme-bg-secondary text-theme-text-primary placeholder:text-theme-text-secondary border border-theme-sidebar-border focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-button text-sm"
        />
      </div>

      <div className="flex flex-col gap-5 overflow-y-auto pr-1">
        {grouped.length === 0 ? (
          <p className="text-theme-text-secondary text-sm px-1">
            {t("common.noResultsForQuery", { query })}
          </p>
        ) : (
          grouped.map((group) => (
            <div key={group.category} className="flex flex-col gap-1">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-theme-text-secondary px-2 mb-1">
                {CATEGORY_LABELS[group.category]}
              </h2>
              {group.entries.map((entry) => {
                const isActive = entry.slug === activeSlug;
                return (
                  <Link
                    key={entry.slug}
                    to={paths.appDocs(`/${entry.slug}`)}
                    onClick={onNavigate}
                    aria-current={isActive ? "page" : undefined}
                    className={`text-sm px-2 py-1.5 rounded-md transition-colors ${
                      isActive
                        ? "bg-theme-sidebar-item-hover text-theme-text-primary font-medium"
                        : "text-theme-text-secondary hover:bg-theme-sidebar-item-hover hover:text-theme-text-primary"
                    }`}
                  >
                    {entry.title}
                  </Link>
                );
              })}
            </div>
          ))
        )}
      </div>
    </nav>
  );
}

function DocsPagination({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const { prev, next } = getAdjacentDocs(slug);
  if (!prev && !next) return null;

  return (
    <nav
      aria-label={t("common.docsNavLabel")}
      className="mt-12 pt-6 border-t border-theme-sidebar-border grid grid-cols-1 sm:grid-cols-2 gap-4"
    >
      {prev ? (
        <Link
          to={paths.appDocs(`/${prev.slug}`)}
          className="group flex items-center gap-3 rounded-lg border border-theme-sidebar-border p-4 transition-colors hover:border-primary-button"
        >
          <ArrowLeft
            className="w-4 h-4 shrink-0 text-theme-text-secondary group-hover:text-primary-button"
            aria-hidden="true"
          />
          <span className="flex flex-col min-w-0">
            <span className="text-xs text-theme-text-secondary">
              {t("common.docsPrevious")}
            </span>
            <span className="text-sm font-medium text-theme-text-primary truncate">
              {prev.title}
            </span>
          </span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link
          to={paths.appDocs(`/${next.slug}`)}
          className="group flex items-center justify-end gap-3 rounded-lg border border-theme-sidebar-border p-4 text-right transition-colors hover:border-primary-button"
        >
          <span className="flex flex-col min-w-0">
            <span className="text-xs text-theme-text-secondary">
              {t("common.docsNext")}
            </span>
            <span className="text-sm font-medium text-theme-text-primary truncate">
              {next.title}
            </span>
          </span>
          <ArrowRight
            className="w-4 h-4 shrink-0 text-theme-text-secondary group-hover:text-primary-button"
            aria-hidden="true"
          />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

export default function Docs() {
  const { t } = useTranslation();
  const { slug } = useParams();
  const [query, setQuery] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [headings, setHeadings] = useState<DocHeading[]>([]);
  const [mainEl, setMainEl] = useState<HTMLElement | null>(null);
  const mobileNavRef = useRef<HTMLDivElement>(null);
  const entry = slug ? getDocBySlug(slug) : null;
  const content = entry ? getDocContent(entry.file) : null;

  const handleHeadings = useCallback((next: DocHeading[]) => {
    setHeadings(next);
  }, []);

  // Reset outline + scroll position when navigating between docs.
  useEffect(() => {
    setHeadings([]);
    mainEl?.scrollTo({ top: 0 });
  }, [slug, mainEl]);

  // Once the heading outline is available, honor any #hash in the URL by
  // scrolling the matching heading into view (deep-linking support).
  useEffect(() => {
    if (headings.length === 0) return;
    const hash = decodeURIComponent(window.location.hash.replace(/^#/, ""));
    if (!hash) return;
    const el = document.getElementById(hash);
    if (el) el.scrollIntoView({ block: "start" });
  }, [headings]);

  // Update page title and meta description based on the selected doc.
  useEffect(() => {
    if (!slug || !entry) return;
    const baseTitle = document.title;
    document.title = `${entry.title} — ${t("common.developerDocs")} | OpenSIN Chat`;
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute("content", entry.description);
    }
    return () => {
      document.title = baseTitle;
    };
  }, [entry, slug, t]);

  // Close mobile navigation with Escape and lock body scroll while open.
  useEffect(() => {
    if (!mobileNavOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileNavOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    // Focus the sidebar container so screen readers announce the panel.
    mobileNavRef.current?.focus();
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileNavOpen]);

  const showToc = Boolean(slug && entry && content);

  return (
    <div className="flex flex-col h-screen w-screen bg-theme-bg-primary text-theme-text-primary overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center justify-between gap-4 px-4 md:px-6 h-14 border-b border-theme-sidebar-border shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileNavOpen((v) => !v)}
            className="lg:hidden p-2 rounded-md hover:bg-theme-sidebar-item-hover"
            aria-label={t("common.toggleNavigation")}
            aria-expanded={mobileNavOpen}
          >
            {mobileNavOpen ? (
              <X className="w-5 h-5" aria-hidden="true" />
            ) : (
              <List className="w-5 h-5" aria-hidden="true" />
            )}
          </button>
          <Link to={paths.appDocs()} className="flex items-center gap-2">
            <BookOpen
              className="w-5 h-5 text-primary-button"
              aria-hidden="true"
            />
            <span className="font-semibold">{t("common.developerDocs")}</span>
          </Link>
        </div>
        <Link
          to={paths.home()}
          className="flex items-center gap-2 text-sm text-theme-text-secondary hover:text-theme-text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span className="hidden sm:inline">{t("common.backToApp")}</span>
        </Link>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex flex-col w-72 shrink-0 border-r border-theme-sidebar-border p-4 overflow-y-auto">
          <DocsSidebar
            activeSlug={slug ?? ""}
            query={query}
            setQuery={setQuery}
            onNavigate={() => {}}
          />
        </aside>

        {/* Mobile sidebar overlay */}
        {mobileNavOpen && (
          <div className="lg:hidden fixed inset-0 z-40 flex">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setMobileNavOpen(false)}
              aria-hidden="true"
            />
            <aside
              ref={mobileNavRef}
              tabIndex={-1}
              aria-modal="true"
              role="dialog"
              className="relative z-50 w-72 max-w-[80vw] h-full bg-theme-bg-primary border-r border-theme-sidebar-border p-4 overflow-y-auto outline-none"
            >
              <DocsSidebar
                activeSlug={slug ?? ""}
                query={query}
                setQuery={setQuery}
                onNavigate={() => setMobileNavOpen(false)}
              />
            </aside>
          </div>
        )}

        {/* Main content */}
        <main
          ref={setMainEl}
          className="flex-1 min-w-0 overflow-y-auto px-4 md:px-10 py-8"
        >
          {!slug ? (
            <DocsLanding />
          ) : !entry || !content ? (
            <div className="max-w-3xl">
              <h1 className="text-2xl font-bold mb-3">
                {t("common.docsNotFound")}
              </h1>
              <p className="text-theme-text-secondary mb-6">
                {t("common.docsNotFoundDesc")}
              </p>
              <Link
                to={paths.appDocs()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-button text-white hover:opacity-90 transition-opacity"
              >
                {t("common.docsHomepage")}
              </Link>
            </div>
          ) : (
            <article className="mx-auto max-w-3xl xl:mx-0">
              <div className="flex items-center justify-between gap-4 mb-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-theme-text-secondary">
                  {CATEGORY_LABELS[entry.category]}
                </p>
                <a
                  href={getEditUrl(entry)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-xs text-theme-text-secondary hover:text-theme-text-primary transition-colors"
                >
                  <GithubLogo className="w-4 h-4" aria-hidden="true" />
                  <span>{t("common.docsEditOnGithub")}</span>
                </a>
              </div>
              <DocsMarkdown content={content} onHeadings={handleHeadings} />
              <DocsPagination slug={slug} />
            </article>
          )}
        </main>

        {/* Right-hand table of contents */}
        {showToc && (
          <aside className="hidden xl:block w-64 shrink-0 border-l border-theme-sidebar-border p-6 overflow-y-auto">
            <div className="sticky top-0">
              <DocsToc headings={headings} scrollRoot={mainEl} />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

// Re-export so the manifest's full list is reachable for potential future use.
export { DOC_ENTRIES };
