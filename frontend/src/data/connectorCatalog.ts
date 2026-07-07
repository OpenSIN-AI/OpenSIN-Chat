// SPDX-License-Identifier: MIT
// Purpose: Static connector catalog definition. Each entry describes a
//          connectable service with icon, provider, product key, and scopes.
//          This is the data source for the Connector Catalog UI.
// Docs: connectorCatalog.doc.md

export interface CatalogEntry {
  id: string;            // unique catalog id, e.g. "gmail"
  provider: string;      // "google" | "github"
  product: string;       // scope-set key, e.g. "gmail", "drive", "repo"
  name: string;          // display name
  description: string;   // short description
  icon: string;          // phosphor icon name or image path
  category: "google" | "github" | "coming_soon";
  comingSoon?: boolean;  // if true, not yet connectable
}

export const CONNECTOR_CATALOG: CatalogEntry[] = [
  // --- Google Workspace (1 OAuth app, different scopes) ---
  {
    id: "gmail",
    provider: "google",
    product: "gmail",
    name: "Gmail",
    description: "E-Mails lesen, senden und durchsuchen",
    icon: "envelope",
    category: "google",
  },
  {
    id: "gdrive",
    provider: "google",
    product: "drive",
    name: "Google Drive",
    description: "Dateien und Ordner verwalten",
    icon: "hard-drive",
    category: "google",
  },
  {
    id: "gdocs",
    provider: "google",
    product: "docs",
    name: "Google Docs",
    description: "Dokumente erstellen und bearbeiten",
    icon: "file-text",
    category: "google",
  },
  {
    id: "gsheets",
    provider: "google",
    product: "sheets",
    name: "Google Sheets",
    description: "Tabellen lesen und schreiben",
    icon: "table",
    category: "google",
  },
  // --- GitHub ---
  {
    id: "github-repo",
    provider: "github",
    product: "repo",
    name: "GitHub Repos",
    description: "Repositories, Issues, PRs verwalten",
    icon: "github-logo",
    category: "github",
  },
  // --- Coming Soon (not yet implemented) ---
  {
    id: "slack",
    provider: "slack",
    product: "slack",
    name: "Slack",
    description: "Nachrichten lesen und senden",
    icon: "chat-circle",
    category: "coming_soon",
    comingSoon: true,
  },
  {
    id: "notion",
    provider: "notion",
    product: "notion",
    name: "Notion",
    description: "Seiten und Datenbanken verwalten",
    icon: "note",
    category: "coming_soon",
    comingSoon: true,
  },
  {
    id: "linear",
    provider: "linear",
    product: "linear",
    name: "Linear",
    description: "Issues und Projekte verwalten",
    icon: "squares-four",
    category: "coming_soon",
    comingSoon: true,
  },
  {
    id: "jira",
    provider: "jira",
    product: "jira",
    name: "Jira",
    description: "Tickets und Sprints verwalten",
    icon: "kanban",
    category: "coming_soon",
    comingSoon: true,
  },
  {
    id: "hubspot",
    provider: "hubspot",
    product: "hubspot",
    name: "HubSpot",
    description: "CRM, Kontakte, Deals",
    icon: "handshake",
    category: "coming_soon",
    comingSoon: true,
  },
  {
    id: "calendar",
    provider: "google",
    product: "calendar",
    name: "Google Calendar",
    description: "Termine erstellen und verwalten",
    icon: "calendar",
    category: "coming_soon",
    comingSoon: true,
  },
];

/**
 * Get catalog entries grouped by category.
 */
export function getCatalogByCategory(): Record<string, CatalogEntry[]> {
  const groups: Record<string, CatalogEntry[]> = {};
  for (const entry of CONNECTOR_CATALOG) {
    if (!groups[entry.category]) groups[entry.category] = [];
    groups[entry.category].push(entry);
  }
  return groups;
}
