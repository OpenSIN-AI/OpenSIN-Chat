// SPDX-License-Identifier: MIT
//
// In-app developer documentation rendered at /docs and /docs/:slug.
// Content is curated from the repository's docs/ folder (see docsManifest.ts).
import { useMemo, useState, useEffect, useRef } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import {
  ArrowLeft,
  MagnifyingGlass,
  BookOpen,
  List,
  X,
} from "@phosphor-icons/react";
import paths from "@/utils/paths";
import DocsMarkdown from "./DocsMarkdown";
import {
  DEFAULT_DOC_SLUG,
  CATEGORY_LABELS,
  getDocBySlug,
  getDocContent,
  getGroupedDocs,
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
      aria-label="Dokumentations-Navigation"
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
          placeholder="Dokumentation durchsuchen…"
          aria-label="Dokumentation durchsuchen"
          className="w-full pl-9 pr-3 py-2 rounded-lg bg-theme-bg-secondary text-theme-text-primary placeholder:text-theme-text-secondary border border-theme-sidebar-border focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-button text-sm"
        />
      </div>

      <div className="flex flex-col gap-5 overflow-y-auto pr-1">
        {grouped.length === 0 ? (
          <p className="text-theme-text-secondary text-sm px-1">
            Keine Treffer für „{query}".
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

export default function Docs() {
  const { slug } = useParams();
  const [query, setQuery] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);
  const asideRef = useRef<HTMLAsideElement>(null);

  // Set document.title for the current documentation page.
  useEffect(() => {
    const entry = getDocBySlug(slug || DEFAULT_DOC_SLUG);
    if (entry) {
      document.title = `${entry.title} · OpenSIN Docs`;
    }
    // Reset title when leaving /docs
    return () => {
      document.title = "OpenSIN Chat";
    };
  }, [slug]);

  // Handle mobile nav: Escape closes it, body scroll is locked when open, focus management.
  useEffect(() => {
    if (!mobileNavOpen) return;

    // Lock body scroll
    const scrollLockClass = "overflow-hidden";
    document.documentElement.classList.add(scrollLockClass);

    // Handle Escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileNavOpen(false);
      }
    };

    // Set focus to the first link in the aside when it opens
    setTimeout(() => {
      const firstLink = asideRef.current?.querySelector("a");
      firstLink?.focus();
    }, 0);

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      // Unlock body scroll
      document.documentElement.classList.remove(scrollLockClass);
      window.removeEventListener("keydown", handleKeyDown);
      // Return focus to toggle button
      toggleButtonRef.current?.focus();
    };
  }, [mobileNavOpen]);

  // Redirect /docs to the default doc.
  if (!slug) {
    return <Navigate to={paths.appDocs(`/${DEFAULT_DOC_SLUG}`)} replace />;
  }

  const entry = getDocBySlug(slug);
  const content = entry ? getDocContent(entry.file) : null;

  return (
    <div className="flex flex-col h-screen w-screen bg-theme-bg-primary text-theme-text-primary overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center justify-between gap-4 px-4 md:px-6 h-14 border-b border-theme-sidebar-border shrink-0">
        <div className="flex items-center gap-3">
          <button
            ref={toggleButtonRef}
            type="button"
            onClick={() => setMobileNavOpen((v) => !v)}
            className="lg:hidden p-2 rounded-md hover:bg-theme-sidebar-item-hover"
            aria-label="Navigation umschalten"
            aria-expanded={mobileNavOpen}
          >
            {mobileNavOpen ? (
              <X className="w-5 h-5" aria-hidden="true" />
            ) : (
              <List className="w-5 h-5" aria-hidden="true" />
            )}
          </button>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary-button" aria-hidden="true" />
            <span className="font-semibold">Entwickler-Dokumentation</span>
          </div>
        </div>
        <Link
          to={paths.home()}
          className="flex items-center gap-2 text-sm text-theme-text-secondary hover:text-theme-text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span className="hidden sm:inline">Zurück zur App</span>
        </Link>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex flex-col w-72 shrink-0 border-r border-theme-sidebar-border p-4 overflow-y-auto">
          <DocsSidebar
            activeSlug={slug}
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
              ref={asideRef}
              className="relative z-50 w-72 max-w-[80vw] h-full bg-theme-bg-primary border-r border-theme-sidebar-border p-4 overflow-y-auto"
            >
              <DocsSidebar
                activeSlug={slug}
                query={query}
                setQuery={setQuery}
                onNavigate={() => setMobileNavOpen(false)}
              />
            </aside>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0 overflow-y-auto px-4 md:px-10 py-8">
          {!entry || !content ? (
            <div className="max-w-3xl">
              <h1 className="text-2xl font-bold mb-3">Seite nicht gefunden</h1>
              <p className="text-theme-text-secondary mb-6">
                Das angeforderte Dokument existiert nicht oder wurde verschoben.
              </p>
              <Link
                to={paths.appDocs(`/${DEFAULT_DOC_SLUG}`)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-button text-white hover:opacity-90 transition-opacity"
              >
                Zur Startseite der Docs
              </Link>
            </div>
          ) : (
            <article>
              <p className="text-xs font-semibold uppercase tracking-wide text-theme-text-secondary mb-2">
                {CATEGORY_LABELS[entry.category]}
              </p>
              <DocsMarkdown content={content} />
            </article>
          )}
        </main>
      </div>
    </div>
  );
}

// Re-export so the manifest's full list is reachable for potential future use.
export { DOC_ENTRIES };
