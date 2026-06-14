// SPDX-License-Identifier: MIT
//
// Manifest of curated developer documentation rendered at /docs.
// Markdown source files live in ./content and are bundled at build time via
// Vite's `?raw` glob import. To add a new page, drop a markdown file into
// ./content and add an entry below.

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
  | "data-sources";

export type DocEntry = {
  /** URL slug used at /docs/:slug */
  slug: string;
  /** Human readable title shown in the sidebar and header */
  title: string;
  /** Short description used for search and the index cards */
  description: string;
  /** Category grouping in the sidebar */
  category: DocCategory;
  /** Filename inside ./content */
  file: string;
};

export const CATEGORY_LABELS: Record<DocCategory, string> = {
  "getting-started": "Erste Schritte",
  api: "API-Referenz",
  architecture: "Architektur",
  deployment: "Deployment & Betrieb",
  "data-sources": "Datenquellen & Sync",
};

// Order in which categories appear in the navigation.
export const CATEGORY_ORDER: DocCategory[] = [
  "getting-started",
  "api",
  "architecture",
  "data-sources",
  "deployment",
];

export const DOC_ENTRIES: DocEntry[] = [
  {
    slug: "user-guide",
    title: "Benutzer-Handbuch",
    description: "Einstieg, Workspaces, Chatten mit Dokumenten und Grundfunktionen.",
    category: "getting-started",
    file: "USER-GUIDE.md",
  },
  {
    slug: "api",
    title: "API-Referenz",
    description: "Vollständige REST-API-Referenz für Entwickler und Integrationen.",
    category: "api",
    file: "API.md",
  },
  {
    slug: "architecture",
    title: "Produktions-Architektur",
    description: "Systemüberblick, Komponenten und Datenfluss der Plattform.",
    category: "architecture",
    file: "architecture.md",
  },
  {
    slug: "adr-overview",
    title: "Architecture Decision Records",
    description: "Überblick über dokumentierte Architekturentscheidungen (ADRs).",
    category: "architecture",
    file: "adr-overview.md",
  },
  {
    slug: "adr-001-persistent-job-queue",
    title: "ADR-001: Persistente Job-Queue",
    description: "Entscheidung und Begründung zur persistenten Job-Queue.",
    category: "architecture",
    file: "adr-001-persistent-job-queue.md",
  },
  {
    slug: "data-sources",
    title: "Datenquellen & Politiker-Sync",
    description: "Woher die Daten stammen und wie der Politiker-Sync funktioniert.",
    category: "data-sources",
    file: "DATA-SOURCES.md",
  },
  {
    slug: "sync-runbook",
    title: "Sync Runbook",
    description: "Betriebshandbuch für den Sync der Politiker-Datenbank.",
    category: "data-sources",
    file: "SYNC-RUNBOOK.md",
  },
  {
    slug: "upstream-sync",
    title: "Upstream-Sync-Strategie",
    description: "Strategie zum Synchronisieren mit dem Upstream-Projekt.",
    category: "data-sources",
    file: "UPSTREAM-SYNC.md",
  },
  {
    slug: "docker-deployment",
    title: "Docker Deployment",
    description: "Deployment der Plattform via Docker, Schritt für Schritt.",
    category: "deployment",
    file: "DOCKER-DEPLOYMENT.md",
  },
  {
    slug: "opensin-chat-deployment",
    title: "OpenSIN Chat Deployment",
    description: "Deployment-Anleitung für sinchat.delqhi.com.",
    category: "deployment",
    file: "OPENSIN-CHAT-DEPLOYMENT.md",
  },
  {
    slug: "auto-deploy",
    title: "Auto-Deploy",
    description: "Lokaler Polling-Cron für automatische Deployments.",
    category: "deployment",
    file: "AUTO-DEPLOY.md",
  },
  {
    slug: "vercel-deploy-fix",
    title: "Vercel Build Fix",
    description: "Lösung für bekannte Vercel-Build-Probleme.",
    category: "deployment",
    file: "vercel-deploy-fix.md",
  },
  {
    slug: "ssh-remote-tunnel",
    title: "SSH Remote Tunnel",
    description: "Mac via Cloudflare als SSH Remote Tunnel einrichten.",
    category: "deployment",
    file: "ssh-remote-tunnel.md",
  },
  {
    slug: "supabase-self-hosted",
    title: "Supabase Self-Hosted",
    description: "Setup für eine selbst gehostete Supabase-Instanz.",
    category: "deployment",
    file: "supabase-self-hosted.md",
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

/** The default doc shown when visiting /docs with no slug. */
export const DEFAULT_DOC_SLUG = "user-guide";

/** Group entries by category, preserving CATEGORY_ORDER. */
export function getGroupedDocs(): { category: DocCategory; entries: DocEntry[] }[] {
  return CATEGORY_ORDER.map((category) => ({
    category,
    entries: DOC_ENTRIES.filter((entry) => entry.category === category),
  })).filter((group) => group.entries.length > 0);
}
