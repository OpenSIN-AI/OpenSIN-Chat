// SPDX-License-Identifier: MIT
// DEV-ONLY mock handlers used purely for optical/UX audits of the right
// sidebar panels without a running backend. Loaded exclusively when
// import.meta.env.DEV === true and the localStorage flag
// `anythingllm_ws_mock` is set to "true". Never active in production.
import { http, HttpResponse } from "msw";

const workspace = {
  id: 1,
  name: "Audit Workspace",
  slug: "audit",
  vectorTag: null,
  createdAt: new Date().toISOString(),
  openAiTemp: 0.7,
  lastUpdatedAt: new Date().toISOString(),
  openAiHistory: 20,
  openAiPrompt: null,
  documents: [
    {
      id: 1,
      docId: "doc-1",
      filename: "afd-grundsatzprogramm.pdf",
      docpath: "custom-documents/afd-grundsatzprogramm.pdf",
      metadata: JSON.stringify({
        title: "AfD Grundsatzprogramm",
        wordCount: 18450,
      }),
    },
    {
      id: 2,
      docId: "doc-2",
      filename: "https://bundestag.de/drucksache-2024",
      docpath: "custom-documents/link-bundestag.json",
      metadata: JSON.stringify({
        title: "Bundestag Drucksache 2024",
        url: "https://bundestag.de/drucksache-2024",
        wordCount: 3200,
      }),
    },
  ],
  threads: [],
};

export const auditHandlers = [
  // --- Workspace core ---
  http.get("*/api/workspace/:slug", () =>
    HttpResponse.json({ workspace })
  ),
  http.get("*/api/workspace/:slug/suggested-messages", () =>
    HttpResponse.json({ suggestedMessages: [] })
  ),
  http.get("*/api/workspace/:slug/is-agent-command-available", () =>
    HttpResponse.json({ showAgentCommand: true })
  ),
  http.get("*/api/workspace/:slug/chats", () =>
    HttpResponse.json({ history: [] })
  ),
  http.get("*/api/workspace/:slug/threads", () =>
    HttpResponse.json({ threads: [] })
  ),

  // --- Filesystem panel ---
  http.get("*/api/utils/filesystem", () =>
    HttpResponse.json({
      platform: "linux",
      arch: "x64",
      nodeVersion: "v20.18.1",
      storage: { current: 412, capacity: 1024 },
      freeMemMB: 6144,
      totalMemMB: 16384,
      uploadPath: "/app/server/storage/documents",
      workDir: "/app/server",
      uptime: 187320,
    })
  ),

  // --- Database panel (AfD politicians) ---
  http.get("*/api/utils/bundestag/politicians", () =>
    HttpResponse.json({
      data: [
        {
          id: 1,
          first_name: "Alice",
          last_name: "Weidel",
          constituency: { label: "Bodensee" },
          abgeordnetenwatch_url: "https://www.abgeordnetenwatch.de/profile/alice-weidel",
        },
        {
          id: 2,
          first_name: "Tino",
          last_name: "Chrupalla",
          constituency: { label: "Görlitz" },
          abgeordnetenwatch_url: "https://www.abgeordnetenwatch.de/profile/tino-chrupalla",
        },
        {
          id: 3,
          first_name: "Beatrix",
          last_name: "von Storch",
          constituency: { label: "Berlin" },
          abgeordnetenwatch_url: "https://www.abgeordnetenwatch.de/profile/beatrix-von-storch",
        },
      ],
    })
  ),

  // --- Political panel (Drucksachen + RSS) ---
  http.get("*/api/utils/bundestag/drucksachen", () =>
    HttpResponse.json({
      documents: [
        {
          id: "d1",
          titel: "Antrag der AfD-Fraktion zur Energiepolitik 2024",
          drucksache_url: "https://dip.bundestag.de/drucksache/d1",
        },
        {
          id: "d2",
          titel: "Kleine Anfrage zur Migrationsstatistik im ersten Quartal",
          drucksache_url: "https://dip.bundestag.de/drucksache/d2",
        },
      ],
    })
  ),
  http.get("*/api/utils/political/rss", () =>
    HttpResponse.json({
      items: [
        {
          title: "AfD fordert sofortige Senkung der Energiesteuer",
          link: "https://afd.de/pressemitteilung-1",
        },
        {
          title: "Pressemitteilung zur Haushaltsdebatte im Bundestag",
          link: "https://afd.de/pressemitteilung-2",
        },
      ],
    })
  ),
];
