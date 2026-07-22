// SPDX-License-Identifier: MIT

export const NOTEBOOK_SOURCE_KINDS = [
  "file",
  "web",
  "youtube",
  "social",
  "repository",
  "notes",
  "cloud",
  "email",
  "machine",
] as const;

export type NotebookSourceKind = (typeof NOTEBOOK_SOURCE_KINDS)[number];

export type NotebookSourceStatus = "connected" | "syncing" | "error" | "disabled";

export interface NotebookSource {
  id: string;
  notebookSlug: string;
  kind: NotebookSourceKind;
  provider: string;
  title: string;
  description?: string;
  uri?: string;
  iconUrl?: string;
  status: NotebookSourceStatus;
  enabled: boolean;
  permissions: {
    read: boolean;
    write: boolean;
    execute: boolean;
  };
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
  lastSyncedAt?: string;
}

export interface NotebookSourceProvider {
  id: string;
  kind: NotebookSourceKind;
  name: string;
  description: string;
  capabilities: {
    read: boolean;
    write: boolean;
    execute: boolean;
    realtimeSync: boolean;
  };
  availability: "ready" | "planned" | "experimental";
}

export const SOURCE_PROVIDERS: NotebookSourceProvider[] = [
  {
    id: "upload",
    kind: "file",
    name: "Dateien",
    description: "PDFs, Dokumente, Tabellen, Bilder und andere Dateien",
    capabilities: { read: true, write: false, execute: false, realtimeSync: false },
    availability: "ready",
  },
  {
    id: "web",
    kind: "web",
    name: "Webseite",
    description: "Eine Webseite oder vollständige Domain einbinden",
    capabilities: { read: true, write: false, execute: false, realtimeSync: true },
    availability: "ready",
  },
  {
    id: "youtube",
    kind: "youtube",
    name: "YouTube",
    description: "Videos über Transkript und Metadaten verwenden",
    capabilities: { read: true, write: false, execute: false, realtimeSync: true },
    availability: "ready",
  },
  {
    id: "social",
    kind: "social",
    name: "Social Media",
    description: "Beiträge, Threads und öffentliche Profile einbinden",
    capabilities: { read: true, write: false, execute: false, realtimeSync: true },
    availability: "planned",
  },
  {
    id: "github",
    kind: "repository",
    name: "GitHub",
    description: "Repositories, Issues und Pull Requests",
    capabilities: { read: true, write: true, execute: false, realtimeSync: true },
    availability: "planned",
  },
  {
    id: "bitbucket",
    kind: "repository",
    name: "Bitbucket",
    description: "Repositories, Pull Requests und Pipelines",
    capabilities: { read: true, write: true, execute: false, realtimeSync: true },
    availability: "planned",
  },
  {
    id: "notion",
    kind: "cloud",
    name: "Notion",
    description: "Seiten und Datenbanken",
    capabilities: { read: true, write: true, execute: false, realtimeSync: true },
    availability: "planned",
  },
  {
    id: "google-drive",
    kind: "cloud",
    name: "Google Drive",
    description: "Dateien und freigegebene Ordner",
    capabilities: { read: true, write: false, execute: false, realtimeSync: true },
    availability: "planned",
  },
  {
    id: "gmail",
    kind: "email",
    name: "Gmail",
    description: "Ausgewählte Nachrichten, Labels und Anhänge",
    capabilities: { read: true, write: true, execute: false, realtimeSync: true },
    availability: "planned",
  },
  {
    id: "local-machine",
    kind: "machine",
    name: "Lokale Maschine",
    description: "Freigegebene Dateien, Verzeichnisse und Befehle",
    capabilities: { read: true, write: true, execute: true, realtimeSync: true },
    availability: "planned",
  },
];
