// SPDX-License-Identifier: MIT
//
// Manifest of curated in-app documentation rendered at /docs.
// Markdown source files live in ./content and are bundled at build time via
// Vite's `?raw` glob import. To add a new page, drop a markdown file into
// ./content and add an entry below.
//
// Audience filter: each entry is tagged user | developer | both. The Docs UI
// shows a segmented control and persists ?audience= in the URL.

// Eagerly import every markdown file in ./content as a raw string.
const rawDocs = import.meta.glob("./content/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

export type DocCategory =
  | "getting-started"
  | "api"
  | "architecture"
  | "deployment"
  | "data-sources"
  | "operations";

/** Who the page is primarily for. "both" appears in user and developer nav. */
export type DocAudienceTag = "user" | "developer" | "both";

/** Active UI audience mode (never "both"). */
export type DocsAudience = "user" | "developer";

export type DocEntry = {
  /** URL slug used at /docs/:slug */
  slug: string;
  /** Human readable title shown in the sidebar and header */
  title: string;
  /** Short description used for search and the index cards */
  description: string;
  /** Category grouping in the sidebar */
  category: DocCategory;
  /** Target audience for nav filtering */
  audience: DocAudienceTag;
  /** Filename inside ./content */
  file: string;
  /** Repo-relative source path, used for the "Edit on GitHub" link */
  source: string;
};

export const CATEGORY_LABELS: Record<DocCategory, string> = {
  "getting-started": "Erste Schritte",
  api: "API-Referenz",
  architecture: "Architektur",
  deployment: "Deployment & Betrieb",
  "data-sources": "Datenquellen & Sync",
  operations: "Sicherheit & Betrieb",
};

const CATEGORY_I18N_KEYS: Record<DocCategory, string> = {
  "getting-started": "common.docsCategories.gettingStarted",
  api: "common.docsCategories.api",
  architecture: "common.docsCategories.architecture",
  deployment: "common.docsCategories.deployment",
  "data-sources": "common.docsCategories.dataSources",
  operations: "common.docsCategories.operations",
};

export function getCategoryLabel(
  category: DocCategory,
  t: (key: string) => string,
): string {
  const i18nKey = CATEGORY_I18N_KEYS[category];
  const translated = t(i18nKey);
  return translated === i18nKey ? CATEGORY_LABELS[category] : translated;
}

// Order in which categories appear in the navigation.
export const CATEGORY_ORDER: DocCategory[] = [
  "getting-started",
  "api",
  "architecture",
  "data-sources",
  "deployment",
  "operations",
];

/** Default audience when no URL/localStorage preference is set. */
export const DEFAULT_DOCS_AUDIENCE: DocsAudience = "user";

/** localStorage key for last-selected docs audience. */
export const DOCS_AUDIENCE_STORAGE_KEY = "docs-audience";

/** Query param name for shareable audience deep-links. */
export const DOCS_AUDIENCE_PARAM = "audience";

export function isDocsAudience(value: unknown): value is DocsAudience {
  return value === "user" || value === "developer";
}

export function parseDocsAudience(value: string | null | undefined): DocsAudience | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "user" || normalized === "users" || normalized === "enduser") {
    return "user";
  }
  if (
    normalized === "developer" ||
    normalized === "dev" ||
    normalized === "tech" ||
    normalized === "admin" ||
    normalized === "ops"
  ) {
    return "developer";
  }
  return null;
}

/** Whether an entry should appear when the UI is in the given audience mode. */
export function entryMatchesAudience(
  entry: DocEntry,
  audience: DocsAudience,
): boolean {
  return entry.audience === "both" || entry.audience === audience;
}

/**
 * Preferred audience when opening a specific doc via deep-link.
 * "both" docs keep the caller's current preference.
 */
export function preferredAudienceForEntry(
  entry: DocEntry,
  fallback: DocsAudience = DEFAULT_DOCS_AUDIENCE,
): DocsAudience {
  if (entry.audience === "user" || entry.audience === "developer") {
    return entry.audience;
  }
  return fallback;
}

/** Build /docs or /docs/:slug with optional audience query. */
export function docsHref(slug?: string | null, audience?: DocsAudience | null): string {
  const path = slug ? `/docs/${slug}` : "/docs";
  if (!audience) return path;
  return `${path}?${DOCS_AUDIENCE_PARAM}=${audience}`;
}

export const DOC_ENTRIES: DocEntry[] = [
  {
    slug: "user-guide",
    title: "Benutzer-Handbuch",
    description:
      "Einstieg, Workspaces, Chatten mit Dokumenten und Grundfunktionen.",
    category: "getting-started",
    audience: "user",
    file: "user-guide.md",
    source: "docs/user-guide.md",
  },
  {
    slug: "api",
    title: "API-Referenz",
    description:
      "Vollständige REST-API-Referenz für Entwickler und Integrationen.",
    category: "api",
    audience: "developer",
    file: "api.md",
    source: "docs/api.md",
  },
  {
    slug: "architecture",
    title: "Produktions-Architektur",
    description: "Systemüberblick, Komponenten und Datenfluss der Plattform.",
    category: "architecture",
    audience: "developer",
    file: "architecture.md",
    source: "docs/architecture.md",
  },
  {
    slug: "adr-overview",
    title: "Architecture Decision Records",
    description:
      "Überblick über dokumentierte Architekturentscheidungen (ADRs).",
    category: "architecture",
    audience: "developer",
    file: "adr-overview.md",
    source: "docs/adr/README.md",
  },
  {
    slug: "adr-001-persistent-job-queue",
    title: "ADR-001: Persistente Job-Queue",
    description: "Entscheidung und Begründung zur persistenten Job-Queue.",
    category: "architecture",
    audience: "developer",
    file: "adr-001-persistent-job-queue.md",
    source: "docs/adr/ADR-001-persistent-job-queue.md",
  },
  {
    slug: "pdf-analysis",
    title: "PDF-Analyse-Pipeline",
    description:
      "70+ Schritt KI-Pipeline für PDF-Analyse: OCR, Vision, Fact-Verifikation, Cross-Check, Corpus-Vergleich.",
    category: "architecture",
    audience: "both",
    file: "pdf-analysis.md",
    source: "docs/PDF-ANALYSIS.md",
  },
  {
    slug: "data-sources",
    title: "Datenquellen & Politiker-Sync",
    description:
      "Woher die Daten stammen und wie der Politiker-Sync funktioniert.",
    category: "data-sources",
    audience: "both",
    file: "data-sources.md",
    source: "docs/DATA-SOURCES.md",
  },
  {
    slug: "sync-runbook",
    title: "Sync Runbook",
    description: "Betriebshandbuch für den Sync der Politiker-Datenbank.",
    category: "data-sources",
    audience: "developer",
    file: "sync-runbook.md",
    source: "docs/SYNC-RUNBOOK.md",
  },
  {
    slug: "upstream-sync",
    title: "Upstream-Sync-Strategie",
    description: "Strategie zum Synchronisieren mit dem Upstream-Projekt.",
    category: "data-sources",
    audience: "developer",
    file: "upstream-sync.md",
    source: "docs/UPSTREAM-SYNC.md",
  },
  {
    slug: "docker-deployment",
    title: "Docker Deployment",
    description: "Deployment der Plattform via Docker, Schritt für Schritt.",
    category: "deployment",
    audience: "developer",
    file: "docker-deployment.md",
    source: "docs/DOCKER-DEPLOYMENT.md",
  },
  {
    slug: "opensin-chat-deployment",
    title: "OpenSIN Chat Deployment",
    description: "Deployment-Anleitung für sinchat.delqhi.com.",
    category: "deployment",
    audience: "developer",
    file: "opensin-chat-deployment.md",
    source: "docs/OPENSIN-CHAT-DEPLOYMENT.md",
  },
  {
    slug: "auto-deploy",
    title: "Auto-Deploy",
    description: "Lokaler Polling-Cron für automatische Deployments.",
    category: "deployment",
    audience: "developer",
    file: "auto-deploy.md",
    source: "docs/AUTO-DEPLOY.md",
  },
  {
    slug: "vercel-deploy-fix",
    title: "Vercel Build Fix",
    description: "Lösung für bekannte Vercel-Build-Probleme.",
    category: "deployment",
    audience: "developer",
    file: "vercel-deploy-fix.md",
    source: "docs/vercel-deploy-fix.md",
  },
  {
    slug: "ssh-remote-tunnel",
    title: "SSH Remote Tunnel",
    description: "Mac via Cloudflare als SSH Remote Tunnel einrichten.",
    category: "deployment",
    audience: "developer",
    file: "ssh-remote-tunnel.md",
    source: "docs/ssh-remote-tunnel.md",
  },
  {
    slug: "supabase-self-hosted",
    title: "Supabase Self-Hosted",
    description: "Setup für eine selbst gehostete Supabase-Instanz.",
    category: "deployment",
    audience: "developer",
    file: "supabase-self-hosted.md",
    source: "docs/supabase-self-hosted.md",
  },
  {
    slug: "security",
    title: "Sicherheits-Handbuch",
    description:
      "Auth-Modi, Secrets-Management, Netzwerk-Sicherheit, DSGVO-Defaults und API-Sicherheit.",
    category: "operations",
    audience: "both",
    file: "security.md",
    source: "docs/security.md",
  },
  {
    slug: "operations",
    title: "Operations-Runbook",
    description:
      "Täglicher Betrieb, Deployments, Backups, Monitoring, Troubleshooting und Incident-Eskalation.",
    category: "operations",
    audience: "developer",
    file: "operations.md",
    source: "docs/operations.md",
  },
  {
    slug: "incident-response",
    title: "Incident-Response-Playbook",
    description:
      "Kanonisches Playbook für Ausfälle: Cloudflare-Fehlercodes, SSH-Recovery, Tunnel-Neustart und Preventiv-Monitoring.",
    category: "operations",
    audience: "developer",
    file: "incident-response.md",
    source: "docs/INCIDENT-RESPONSE.md",
  },
];

/** Resolve the raw markdown content for a given content filename. */
export function getDocContent(file: string): string | null {
  const key = `./content/${file}`;
  return rawDocs[key] ?? null;
}

/** Find a doc entry by its slug. */
export function getDocBySlug(slug: string): DocEntry | undefined {
  return DOC_ENTRIES.find((entry) => entry.slug === slug);
}

/** The default doc shown when visiting /docs with no slug (legacy). */
export const DEFAULT_DOC_SLUG = "user-guide";

/** GitHub blob base for docs not included in the in-app documentation. */
const GITHUB_DOCS_BASE = "https://github.com/OpenSIN-AI/OpenSIN-Chat/blob/main";

/** Map of source markdown filename (as referenced in repo) -> in-app slug. */
const FILE_TO_SLUG: Record<string, string> = {
  "USER-GUIDE.md": "user-guide",
  "API.md": "api",
  "architecture.md": "architecture",
  "DATA-SOURCES.md": "data-sources",
  "SYNC-RUNBOOK.md": "sync-runbook",
  "UPSTREAM-SYNC.md": "upstream-sync",
  "DOCKER-DEPLOYMENT.md": "docker-deployment",
  "OPENSIN-CHAT-DEPLOYMENT.md": "opensin-chat-deployment",
  "AUTO-DEPLOY.md": "auto-deploy",
  "vercel-deploy-fix.md": "vercel-deploy-fix",
  "ssh-remote-tunnel.md": "ssh-remote-tunnel",
  "supabase-self-hosted.md": "supabase-self-hosted",
  "ADR-001-persistent-job-queue.md": "adr-001-persistent-job-queue",
  "PDF-ANALYSIS.md": "pdf-analysis",
  "SECURITY.md": "security",
  "OPERATIONS.md": "operations",
  "INCIDENT-RESPONSE.md": "incident-response",
  "api.md": "api",
  "user-guide.md": "user-guide",
  "security.md": "security",
  "operations.md": "operations",
};

/**
 * Resolve a relative markdown link (as found inside a doc) to either an in-app
 * /docs route (when the target is part of the documentation) or a GitHub blob
 * URL (for files that are not surfaced in-app, e.g. SECURITY.md).
 * Returns null for links that should be left untouched (external, anchors).
 */
export function resolveDocLink(
  href: string,
): { url: string; external: boolean } | null {
  if (!href) return null;
  // Leave absolute URLs, mailto and pure anchors untouched.
  if (/^(https?:|mailto:|#)/i.test(href)) return null;
  if (!href.includes(".md")) return null;

  const [path, hash] = href.split("#");
  const anchor = hash ? `#${hash}` : "";
  // Basename without any ./ or ../ segments.
  const fileName = path.split("/").filter(Boolean).pop() ?? "";

  const slug = FILE_TO_SLUG[fileName];
  if (slug) {
    return { url: `/docs/${slug}${anchor}`, external: false };
  }

  // Reconstruct a repo-relative path for GitHub. The docs live under /docs,
  // so `../FILE.md` points at the repo root while `./FILE.md` stays in /docs.
  const goesToRoot = /^\.\.\//.test(path);
  const bare = path.replace(/^(\.\/|\.\.\/)+/, "");
  const repoPath =
    goesToRoot || bare.startsWith("docs/") ? bare : `docs/${bare}`;
  return { url: `${GITHUB_DOCS_BASE}/${repoPath}${anchor}`, external: true };
}

/** Group entries by category, optionally filtered by UI audience. */
export function getGroupedDocs(audience?: DocsAudience): {
  category: DocCategory;
  entries: DocEntry[];
}[] {
  return CATEGORY_ORDER.map((category) => ({
    category,
    entries: DOC_ENTRIES.filter(
      (entry) =>
        entry.category === category &&
        (audience ? entryMatchesAudience(entry, audience) : true),
    ),
  })).filter((group) => group.entries.length > 0);
}

/** Flat list of all entries in navigation order (category order, then list). */
export function getOrderedDocs(audience?: DocsAudience): DocEntry[] {
  return getGroupedDocs(audience).flatMap((group) => group.entries);
}

/** Resolve the previous/next entry relative to a slug, in navigation order. */
export function getAdjacentDocs(
  slug: string,
  audience?: DocsAudience,
): {
  prev: DocEntry | null;
  next: DocEntry | null;
} {
  const ordered = getOrderedDocs(audience);
  const index = ordered.findIndex((entry) => entry.slug === slug);
  if (index === -1) return { prev: null, next: null };
  return {
    prev: index > 0 ? ordered[index - 1] : null,
    next: index < ordered.length - 1 ? ordered[index + 1] : null,
  };
}

/** Build the "Edit on GitHub" URL for a given entry. */
export function getEditUrl(entry: DocEntry): string {
  return `${GITHUB_DOCS_BASE}/${entry.source}`;
}
