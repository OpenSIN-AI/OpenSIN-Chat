// SPDX-License-Identifier: MIT
//
// In-app documentation rendered at /docs and /docs/:slug.
// Content is curated from the repository's docs/ folder (see docsManifest.ts).
// Supports User vs Developer audience filtering via ?audience= + localStorage.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { ArrowLeft } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import { ArrowRight } from "@phosphor-icons/react/dist/csr/ArrowRight";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { BookOpen } from "@phosphor-icons/react/dist/csr/BookOpen";
import { List } from "@phosphor-icons/react/dist/csr/List";
import { TextAlignLeft } from "@phosphor-icons/react/dist/csr/TextAlignLeft";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { GithubLogo } from "@phosphor-icons/react/dist/csr/GithubLogo";
import paths from "@/utils/paths";
import ThemeToggle from "@/components/ThemeToggle";
import DocsMarkdown, { type DocHeading } from "./DocsMarkdown";
import DocsToc from "./DocsToc";
import DocsLanding from "./DocsLanding";
import {
  DEFAULT_DOCS_AUDIENCE,
  DOCS_AUDIENCE_PARAM,
  DOCS_AUDIENCE_STORAGE_KEY,
  docsHref,
  entryMatchesAudience,
  getCategoryLabel,
  getDocBySlug,
  getDocContent,
  getGroupedDocs,
  getAdjacentDocs,
  getEditUrl,
  parseDocsAudience,
  preferredAudienceForEntry,
  type DocsAudience,
} from "./docsManifest";
import "./docs.css";

function readStoredAudience(): DocsAudience | null {
  try {
    return parseDocsAudience(window.localStorage.getItem(DOCS_AUDIENCE_STORAGE_KEY));
  } catch {
    return null;
  }
}

function persistAudience(audience: DocsAudience) {
  try {
    window.localStorage.setItem(DOCS_AUDIENCE_STORAGE_KEY, audience);
  } catch {
    // ignore quota / private mode
  }
}

function DocsAudienceSwitch({
  audience,
  onChange,
}: {
  audience: DocsAudience;
  onChange: (next: DocsAudience) => void;
}) {
  const { t } = useTranslation();
  const options: { id: DocsAudience; label: string }[] = [
    { id: "user", label: t("common.docsAudienceUser") },
    { id: "developer", label: t("common.docsAudienceDeveloper") },
  ];

  return (
    <div
      role="group"
      aria-label={t("common.docsAudienceSwitchLabel")}
      className="inline-flex rounded-lg border border-theme-sidebar-border p-0.5 bg-theme-bg-secondary"
    >
      {options.map((option) => {
        const active = audience === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            aria-pressed={active}
            className={`px-2.5 sm:px-3 py-1 text-xs sm:text-sm rounded-md transition-colors ${
              active
                ? "bg-primary-button text-white font-medium"
                : "text-theme-text-secondary hover:text-theme-text-primary"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function DocsSidebar({
  activeSlug,
  query,
  setQuery,
  onNavigate,
  audience,
}: {
  activeSlug: string;
  query: string;
  setQuery: (v: string) => void;
  onNavigate: () => void;
  audience: DocsAudience;
}) {
  const { t } = useTranslation();
  const normalizedQuery = query.trim().toLowerCase();

  const grouped = useMemo(() => {
    const groups = getGroupedDocs(audience);
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
  }, [normalizedQuery, audience]);

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
                {getCategoryLabel(group.category, t)}
              </h2>
              {group.entries.map((entry) => {
                const isActive = entry.slug === activeSlug;
                return (
                  <Link
                    key={entry.slug}
                    to={docsHref(entry.slug, audience)}
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

function DocsPagination({
  slug,
  audience,
}: {
  slug: string;
  audience: DocsAudience;
}) {
  const { t } = useTranslation();
  const { prev, next } = getAdjacentDocs(slug, audience);
  if (!prev && !next) return null;

  return (
    <nav
      aria-label={t("common.docsNavLabel")}
      className="mt-12 pt-6 border-t border-theme-sidebar-border grid grid-cols-1 sm:grid-cols-2 gap-4"
    >
      {prev ? (
        <Link
          to={docsHref(prev.slug, audience)}
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
          to={docsHref(next.slug, audience)}
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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mobileTocOpen, setMobileTocOpen] = useState(false);
  const [headings, setHeadings] = useState<DocHeading[]>([]);
  const [mainEl, setMainEl] = useState<HTMLElement | null>(null);
  const mobileNavRef = useRef<HTMLDivElement>(null);
  const mobileTocRef = useRef<HTMLDivElement>(null);
  const entry = useMemo(() => (slug ? getDocBySlug(slug) : null), [slug]);
  const content = useMemo(
    () => (entry ? getDocContent(entry.file) : null),
    [entry],
  );

  const audienceFromUrl = parseDocsAudience(
    searchParams.get(DOCS_AUDIENCE_PARAM),
  );

  // Resolve audience: URL > doc preference (deep-link) > localStorage > default.
  const audience: DocsAudience = useMemo(() => {
    if (audienceFromUrl) return audienceFromUrl;
    if (entry && entry.audience !== "both") {
      return preferredAudienceForEntry(entry, DEFAULT_DOCS_AUDIENCE);
    }
    return readStoredAudience() ?? DEFAULT_DOCS_AUDIENCE;
  }, [audienceFromUrl, entry]);

  // Keep ?audience= and localStorage in sync once resolved.
  useEffect(() => {
    persistAudience(audience);
    if (searchParams.get(DOCS_AUDIENCE_PARAM) === audience) return;
    const next = new URLSearchParams(searchParams);
    next.set(DOCS_AUDIENCE_PARAM, audience);
    setSearchParams(next, { replace: true });
    // Only re-run when the resolved audience changes — not on every searchParams identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [audience, setSearchParams]);

  const setAudience = useCallback(
    (next: DocsAudience) => {
      persistAudience(next);
      const params = new URLSearchParams(searchParams);
      params.set(DOCS_AUDIENCE_PARAM, next);

      // If the open page is not visible in the new audience, return to landing.
      if (entry && !entryMatchesAudience(entry, next)) {
        navigate(docsHref(null, next));
        return;
      }

      setSearchParams(params, { replace: true });
    },
    [entry, navigate, searchParams, setSearchParams],
  );

  const handleHeadings = useCallback((next: DocHeading[]) => {
    setHeadings(next);
  }, []);

  // Keyboard shortcut: "/" focuses the search input.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && !mobileNavOpen) {
        const target = e.target as HTMLElement;
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable
        )
          return;
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>(
          'aside input[type="search"]',
        );
        searchInput?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileNavOpen]);

  // Scroll the main content area to the top when navigating between docs.
  useEffect(() => {
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
    document.title = entry ? `${entry.title} — OpenSIN Chat` : "OpenSIN Chat";
    if (!slug || !entry) return;
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute("content", entry.description);
    }
  }, [entry, slug]);

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

  // Close mobile TOC with Escape and lock body scroll while open.
  useEffect(() => {
    if (!mobileTocOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileTocOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    mobileTocRef.current?.focus();
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileTocOpen]);

  const showToc = Boolean(slug && entry && content);
  const headerTitle =
    audience === "developer"
      ? t("common.docsAudienceDeveloperTitle")
      : t("common.docsTitle");

  return (
    <div className="flex flex-col h-screen w-screen bg-theme-bg-primary text-theme-text-primary overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center justify-between gap-3 sm:gap-4 px-4 md:px-6 h-14 border-b border-theme-sidebar-border shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setMobileNavOpen((v) => !v)}
            className="lg:hidden p-2 rounded-md hover:bg-theme-sidebar-item-hover shrink-0"
            aria-label={t("common.toggleNavigation")}
            aria-expanded={mobileNavOpen}
          >
            {mobileNavOpen ? (
              <X className="w-5 h-5" aria-hidden="true" />
            ) : (
              <List className="w-5 h-5" aria-hidden="true" />
            )}
          </button>
          <Link
            to={docsHref(null, audience)}
            className="flex items-center gap-2 min-w-0"
          >
            <BookOpen
              className="w-5 h-5 text-primary-button shrink-0"
              aria-hidden="true"
            />
            <span className="font-semibold truncate">{headerTitle}</span>
          </Link>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <DocsAudienceSwitch audience={audience} onChange={setAudience} />
          <ThemeToggle className="flex items-center justify-center w-8 h-8 rounded-lg border-none cursor-pointer transition-all bg-transparent hover:bg-theme-sidebar-item-hover text-theme-text-primary flex-shrink-0" />
          <Link
            to={paths.home()}
            className="flex items-center gap-2 text-sm text-theme-text-secondary hover:text-theme-text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">{t("common.backToApp")}</span>
          </Link>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex flex-col w-72 shrink-0 border-r border-theme-sidebar-border p-4 overflow-y-auto">
          <DocsSidebar
            activeSlug={slug ?? ""}
            query={query}
            setQuery={setQuery}
            onNavigate={() => {}}
            audience={audience}
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
                audience={audience}
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
            <DocsLanding audience={audience} onAudienceChange={setAudience} />
          ) : !entry || !content ? (
            <div className="max-w-3xl">
              <h1 className="text-2xl font-bold mb-3">
                {t("common.docsNotFound")}
              </h1>
              <p className="text-theme-text-secondary mb-6">
                {t("common.docsNotFoundDesc")}
              </p>
              <Link
                to={docsHref(null, audience)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-button text-white hover:opacity-90 transition-opacity"
              >
                {t("common.docsHomepage")}
              </Link>
            </div>
          ) : (
            <article className="mx-auto max-w-3xl lg:mx-0">
              <div className="flex items-center justify-between gap-4 mb-2">
                <div className="flex items-center gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-theme-text-secondary">
                    {getCategoryLabel(entry.category, t)}
                  </p>
                  <span className="text-xs text-theme-text-secondary">
                    {Math.max(1, Math.ceil(content.length / 1000))} min Lesezeit
                  </span>
                </div>
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
              <DocsPagination slug={slug} audience={audience} />
            </article>
          )}
        </main>

        {/* Right-hand table of contents */}
        {showToc && (
          <aside className="hidden lg:block w-60 xl:w-64 shrink-0 border-l border-theme-sidebar-border p-6 overflow-y-auto">
            <div className="sticky top-0">
              <DocsToc headings={headings} scrollRoot={mainEl} />
            </div>
          </aside>
        )}

        {/* Mobile TOC floating button */}
        {showToc && (
          <button
            type="button"
            onClick={() => setMobileTocOpen((v) => !v)}
            className="lg:hidden fixed bottom-6 right-6 z-30 p-3 rounded-full bg-primary-button text-white shadow-lg hover:opacity-90 transition-opacity"
            aria-label={t("common.docsOnThisPage")}
            aria-expanded={mobileTocOpen}
          >
            {mobileTocOpen ? (
              <X className="w-5 h-5" aria-hidden="true" />
            ) : (
              <TextAlignLeft className="w-5 h-5" aria-hidden="true" />
            )}
          </button>
        )}

        {/* Mobile TOC drawer */}
        {mobileTocOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex items-end justify-center sm:items-center">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setMobileTocOpen(false)}
              aria-hidden="true"
            />
            <aside
              ref={mobileTocRef}
              tabIndex={-1}
              aria-modal="true"
              role="dialog"
              aria-label={t("common.docsOnThisPage")}
              className="relative z-50 w-full max-w-sm max-h-[70vh] sm:max-h-[60vh] bg-theme-bg-primary border-t sm:border border-theme-sidebar-border sm:rounded-lg p-4 pt-11 overflow-y-auto outline-none"
            >
              <button
                type="button"
                onClick={() => setMobileTocOpen(false)}
                className="absolute top-3 right-4 p-1 rounded-md hover:bg-theme-sidebar-item-hover"
                aria-label={t("common.close")}
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
              <DocsToc
                headings={headings}
                scrollRoot={mainEl}
                onNavigate={() => setMobileTocOpen(false)}
              />
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

// Re-export so the manifest's full list is reachable for potential future use.
export { DOC_ENTRIES } from "./docsManifest";
