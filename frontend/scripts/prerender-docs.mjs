#!/usr/bin/env node
// SPDX-License-Identifier: MIT
//
// Static prerender for the /docs pages. Runs after the Vite build so the
// server can serve the pre-rendered HTML shell for the initial docs paint,
// dramatically improving LCP on mobile/desktop. The React app still hydrates
// the same markup once its bundle boots.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { JSDOM } from "jsdom";
import MarkdownIt from "markdown-it";
import hljs from "highlight.js/lib/core";
import DOMPurifyFactory from "dompurify";

import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import python from "highlight.js/lib/languages/python";
import json from "highlight.js/lib/languages/json";
import xml from "highlight.js/lib/languages/xml";
import bash from "highlight.js/lib/languages/bash";
import shell from "highlight.js/lib/languages/shell";
import css from "highlight.js/lib/languages/css";
import sql from "highlight.js/lib/languages/sql";
import yaml from "highlight.js/lib/languages/yaml";
import markdown from "highlight.js/lib/languages/markdown";
import go from "highlight.js/lib/languages/go";
import rust from "highlight.js/lib/languages/rust";
import java from "highlight.js/lib/languages/java";
import c from "highlight.js/lib/languages/c";
import cpp from "highlight.js/lib/languages/cpp";
import diff from "highlight.js/lib/languages/diff";
import dockerfile from "highlight.js/lib/languages/dockerfile";
import nginx from "highlight.js/lib/languages/nginx";
import ini from "highlight.js/lib/languages/ini";
import protobuf from "highlight.js/lib/languages/protobuf";
import graphql from "highlight.js/lib/languages/graphql";

hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("js", javascript);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("ts", typescript);
hljs.registerLanguage("python", python);
hljs.registerLanguage("py", python);
hljs.registerLanguage("json", json);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("html", xml);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("sh", bash);
hljs.registerLanguage("shell", shell);
hljs.registerLanguage("console", shell);
hljs.registerLanguage("css", css);
hljs.registerLanguage("sql", sql);
hljs.registerLanguage("yaml", yaml);
hljs.registerLanguage("yml", yaml);
hljs.registerLanguage("markdown", markdown);
hljs.registerLanguage("md", markdown);
hljs.registerLanguage("go", go);
hljs.registerLanguage("golang", go);
hljs.registerLanguage("rust", rust);
hljs.registerLanguage("rs", rust);
hljs.registerLanguage("java", java);
hljs.registerLanguage("c", c);
hljs.registerLanguage("cpp", cpp);
hljs.registerLanguage("c++", cpp);
hljs.registerLanguage("diff", diff);
hljs.registerLanguage("dockerfile", dockerfile);
hljs.registerLanguage("docker", dockerfile);
hljs.registerLanguage("nginx", nginx);
hljs.registerLanguage("ini", ini);
hljs.registerLanguage("toml", ini);
hljs.registerLanguage("conf", ini);
hljs.registerLanguage("protobuf", protobuf);
hljs.registerLanguage("proto", protobuf);
hljs.registerLanguage("graphql", graphql);
hljs.registerLanguage("gql", graphql);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = path.resolve(__dirname, "../src/pages/Docs/content");
const OUT_DIR = path.resolve(__dirname, "../dist/docs");

const GITHUB_DOCS_BASE = "https://github.com/OpenSIN-AI/OpenSIN-Chat/blob/main";

const CATEGORY_LABELS = {
  "getting-started": "Erste Schritte",
  api: "API-Referenz",
  architecture: "Architektur",
  deployment: "Deployment & Betrieb",
  "data-sources": "Datenquellen & Sync",
  operations: "Sicherheit & Betrieb",
};

const CATEGORY_ORDER = [
  "getting-started",
  "api",
  "architecture",
  "data-sources",
  "deployment",
  "operations",
];

const FILE_TO_SLUG = {
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
};

const DOC_ENTRIES = [
  {
    slug: "user-guide",
    title: "Benutzer-Handbuch",
    description: "Einstieg, Workspaces, Chatten mit Dokumenten und Grundfunktionen.",
    category: "getting-started",
    file: "user-guide.md",
    source: "docs/USER-GUIDE.md",
  },
  {
    slug: "api",
    title: "API-Referenz",
    description: "Vollständige REST-API-Referenz für Entwickler und Integrationen.",
    category: "api",
    file: "api.md",
    source: "docs/API.md",
  },
  {
    slug: "architecture",
    title: "Produktions-Architektur",
    description: "Systemüberblick, Komponenten und Datenfluss der Plattform.",
    category: "architecture",
    file: "architecture.md",
    source: "docs/architecture.md",
  },
  {
    slug: "adr-overview",
    title: "Architecture Decision Records",
    description: "Überblick über dokumentierte Architekturentscheidungen (ADRs).",
    category: "architecture",
    file: "adr-overview.md",
    source: "docs/adr/README.md",
  },
  {
    slug: "adr-001-persistent-job-queue",
    title: "ADR-001: Persistente Job-Queue",
    description: "Entscheidung und Begründung zur persistenten Job-Queue.",
    category: "architecture",
    file: "adr-001-persistent-job-queue.md",
    source: "docs/adr/ADR-001-persistent-job-queue.md",
  },
  {
    slug: "pdf-analysis",
    title: "PDF-Analyse-Pipeline",
    description: "70+ Schritt KI-Pipeline für PDF-Analyse: OCR, Vision, Fact-Verifikation, Cross-Check, Corpus-Vergleich.",
    category: "architecture",
    file: "pdf-analysis.md",
    source: "docs/PDF-ANALYSIS.md",
  },
  {
    slug: "data-sources",
    title: "Datenquellen & Politiker-Sync",
    description: "Woher die Daten stammen und wie der Politiker-Sync funktioniert.",
    category: "data-sources",
    file: "data-sources.md",
    source: "docs/DATA-SOURCES.md",
  },
  {
    slug: "sync-runbook",
    title: "Sync Runbook",
    description: "Betriebshandbuch für den Sync der Politiker-Datenbank.",
    category: "data-sources",
    file: "sync-runbook.md",
    source: "docs/SYNC-RUNBOOK.md",
  },
  {
    slug: "upstream-sync",
    title: "Upstream-Sync-Strategie",
    description: "Strategie zum Synchronisieren mit dem Upstream-Projekt.",
    category: "data-sources",
    file: "upstream-sync.md",
    source: "docs/UPSTREAM-SYNC.md",
  },
  {
    slug: "docker-deployment",
    title: "Docker Deployment",
    description: "Deployment der Plattform via Docker, Schritt für Schritt.",
    category: "deployment",
    file: "docker-deployment.md",
    source: "docs/DOCKER-DEPLOYMENT.md",
  },
  {
    slug: "opensin-chat-deployment",
    title: "OpenSIN Chat Deployment",
    description: "Deployment-Anleitung für sinchat.delqhi.com.",
    category: "deployment",
    file: "opensin-chat-deployment.md",
    source: "docs/OPENSIN-CHAT-DEPLOYMENT.md",
  },
  {
    slug: "auto-deploy",
    title: "Auto-Deploy",
    description: "Lokaler Polling-Cron für automatische Deployments.",
    category: "deployment",
    file: "auto-deploy.md",
    source: "docs/AUTO-DEPLOY.md",
  },
  {
    slug: "vercel-deploy-fix",
    title: "Vercel Build Fix",
    description: "Lösung für bekannte Vercel-Build-Probleme.",
    category: "deployment",
    file: "vercel-deploy-fix.md",
    source: "docs/vercel-deploy-fix.md",
  },
  {
    slug: "ssh-remote-tunnel",
    title: "SSH Remote Tunnel",
    description: "Mac via Cloudflare als SSH Remote Tunnel einrichten.",
    category: "deployment",
    file: "ssh-remote-tunnel.md",
    source: "docs/ssh-remote-tunnel.md",
  },
  {
    slug: "supabase-self-hosted",
    title: "Supabase Self-Hosted",
    description: "Setup für eine selbst gehostete Supabase-Instanz.",
    category: "deployment",
    file: "supabase-self-hosted.md",
    source: "docs/supabase-self-hosted.md",
  },
  {
    slug: "security",
    title: "Sicherheits-Handbuch",
    description: "Auth-Modi, Secrets-Management, Netzwerk-Sicherheit, DSGVO-Defaults und API-Sicherheit.",
    category: "operations",
    file: "security.md",
    source: "docs/SECURITY.md",
  },
  {
    slug: "operations",
    title: "Operations-Runbook",
    description: "Täglicher Betrieb, Deployments, Backups, Monitoring, Troubleshooting und Incident-Eskalation.",
    category: "operations",
    file: "operations.md",
    source: "docs/OPERATIONS.md",
  },
];

function getGroupedDocs() {
  return CATEGORY_ORDER.map((category) => ({
    category,
    entries: DOC_ENTRIES.filter((entry) => entry.category === category),
  })).filter((group) => group.entries.length > 0);
}

function getOrderedDocs() {
  return getGroupedDocs().flatMap((group) => group.entries);
}

function getAdjacentDocs(slug) {
  const ordered = getOrderedDocs();
  const index = ordered.findIndex((entry) => entry.slug === slug);
  if (index === -1) return { prev: null, next: null };
  return {
    prev: index > 0 ? ordered[index - 1] : null,
    next: index < ordered.length - 1 ? ordered[index + 1] : null,
  };
}

function resolveDocLink(href) {
  if (!href) return null;
  if (/^(https?:|mailto:|#)/i.test(href)) return null;
  if (!href.includes(".md")) return null;

  const [path, hash] = href.split("#");
  const anchor = hash ? `#${hash}` : "";
  const fileName = path.split("/").filter(Boolean).pop() ?? "";

  const slug = FILE_TO_SLUG[fileName];
  if (slug) {
    return { url: `/docs/${slug}${anchor}`, external: false };
  }

  const goesToRoot = /^\.\.\//.test(path);
  const bare = path.replace(/^(\.\/|\.\.\/)+/, "");
  const repoPath = goesToRoot || bare.startsWith("docs/") ? bare : `docs/${bare}`;
  return { url: `${GITHUB_DOCS_BASE}/${repoPath}${anchor}`, external: true };
}

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[`*_~]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

function renderMarkdown(content) {
  const md = new MarkdownIt({
    html: true,
    linkify: true,
    breaks: false,
  });

  const defaultLinkOpen =
    md.renderer.rules.link_open ||
    ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));

  md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
    const token = tokens[idx];
    const hrefIndex = token.attrIndex("href");
    if (hrefIndex >= 0) {
      const href = token.attrs[hrefIndex][1];
      const resolved = resolveDocLink(href);
      if (resolved) {
        token.attrs[hrefIndex][1] = resolved.url;
        if (resolved.external) {
          token.attrSet("target", "_blank");
          token.attrSet("rel", "noreferrer");
        } else {
          token.attrSet("data-internal", "true");
        }
      }
    }
    return defaultLinkOpen(tokens, idx, options, env, self);
  };

  const copyIcon =
    '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
  const checkIcon =
    '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>';

  md.renderer.rules.fence = function (tokens, idx) {
    const token = tokens[idx];
    const info = token.info ? token.info.trim() : "";
    const lang = info.split(/\s+/g)[0] || "";
    let highlighted;
    if (lang && hljs.getLanguage(lang)) {
      try {
        highlighted = hljs.highlight(token.content, { language: lang }).value;
      } catch {
        highlighted = md.utils.escapeHtml(token.content);
      }
    } else {
      highlighted = md.utils.escapeHtml(token.content);
    }
    const label = md.utils.escapeHtml(lang || "text");
    const codeClass = lang ? `hljs language-${lang}` : "hljs";
    return (
      `<div class="docs-code-block">` +
      `<div class="docs-code-header">` +
      `<span class="docs-code-lang">${label}</span>` +
      `<button class="docs-code-copy" type="button" data-copy>` +
      `<span class="docs-code-copy-icon">${copyIcon}${checkIcon}</span>` +
      `<span class="docs-code-copy-label"></span>` +
      `</button>` +
      `</div>` +
      `<pre><code class="${codeClass}">${highlighted}</code></pre>` +
      `</div>`
    );
  };

  const env = {};
  const tokens = md.parse(content, env);
  const headings = [];
  const used = new Map();

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type === "heading_open" && (token.tag === "h2" || token.tag === "h3")) {
      const inline = tokens[i + 1];
      const text = inline?.content ?? "";
      let slug = slugify(text) || "section";
      const count = used.get(slug) ?? 0;
      used.set(slug, count + 1);
      if (count > 0) slug = `${slug}-${count}`;
      token.attrSet("id", slug);
      token.attrSet("class", "docs-heading");
      headings.push({ id: slug, text, level: token.tag === "h2" ? 2 : 3 });
    }
  }

  const rendered = md.renderer.render(tokens, md.options, env);

  const dom = new JSDOM("<!DOCTYPE html>");
  const DOMPurify = DOMPurifyFactory(dom.window);
  const safe = DOMPurify.sanitize(rendered, {
    ADD_ATTR: ["data-internal", "data-copy", "target", "rel", "id"],
  });

  return { html: safe, headings };
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderSidebar(activeSlug) {
  const grouped = getGroupedDocs();
  let html = "";
  for (const group of grouped) {
    html += `<div class="flex flex-col gap-1">`;
    html += `<h2 class="text-xs font-semibold uppercase tracking-wide text-theme-text-secondary px-2 mb-1">${escapeHtml(
      CATEGORY_LABELS[group.category],
    )}</h2>`;
    for (const entry of group.entries) {
      const isActive = entry.slug === activeSlug;
      html += `<a href="/docs/${entry.slug}" class="text-sm px-2 py-1.5 rounded-md transition-colors ${
        isActive
          ? "bg-theme-sidebar-item-hover text-theme-text-primary font-medium"
          : "text-theme-text-secondary hover:bg-theme-sidebar-item-hover hover:text-theme-text-primary"
      }">${escapeHtml(entry.title)}</a>`;
    }
    html += `</div>`;
  }
  return html;
}

function renderToc(headings) {
  if (headings.length < 2) return "";
  let html =
    '<nav aria-label="Auf dieser Seite" class="text-sm flex flex-col gap-2"><p class="text-xs font-semibold uppercase tracking-wide text-theme-text-secondary">Auf dieser Seite</p><ul class="flex flex-col gap-1 border-l border-theme-sidebar-border">';
  for (const heading of headings) {
    html += `<li><a href="#${heading.id}" class="block py-1 -ml-px border-l-2 transition-colors ${
      heading.level === 3 ? "pl-6" : "pl-3"
    } border-transparent text-theme-text-secondary hover:text-theme-text-primary hover:border-theme-sidebar-border">${escapeHtml(
      heading.text,
    )}</a></li>`;
  }
  html += "</ul></nav>";
  return html;
}

function renderPagination(slug) {
  const { prev, next } = getAdjacentDocs(slug);
  if (!prev && !next) return "";
  let html =
    '<nav aria-label="Docs" class="mt-12 pt-6 border-t border-theme-sidebar-border grid grid-cols-1 sm:grid-cols-2 gap-4">';
  if (prev) {
    html += `<a href="/docs/${prev.slug}" class="group flex items-center gap-3 rounded-lg border border-theme-sidebar-border p-4 transition-colors hover:border-primary-button"><span class="flex flex-col min-w-0"><span class="text-xs text-theme-text-secondary">Zurück</span><span class="text-sm font-medium text-theme-text-primary truncate">${escapeHtml(
      prev.title,
    )}</span></span></a>`;
  } else {
    html += "<span />";
  }
  if (next) {
    html += `<a href="/docs/${next.slug}" class="group flex items-center justify-end gap-3 rounded-lg border border-theme-sidebar-border p-4 text-right transition-colors hover:border-primary-button"><span class="flex flex-col min-w-0"><span class="text-xs text-theme-text-secondary">Weiter</span><span class="text-sm font-medium text-theme-text-primary truncate">${escapeHtml(
      next.title,
    )}</span></span></a>`;
  } else {
    html += "<span />";
  }
  html += "</nav>";
  return html;
}

function renderPage(entry) {
  const contentPath = path.join(CONTENT_DIR, entry.file);
  const raw = fs.readFileSync(contentPath, "utf8");
  const { html: bodyHtml, headings } = renderMarkdown(raw);
  const tocHtml = renderToc(headings);
  const sidebarHtml = renderSidebar(entry.slug);
  const paginationHtml = renderPagination(entry.slug);

  return `
<div class="flex flex-col h-screen w-screen bg-theme-bg-primary text-theme-text-primary overflow-hidden">
  <header class="flex items-center justify-between gap-4 px-4 md:px-6 h-14 border-b border-theme-sidebar-border shrink-0">
    <div class="flex items-center gap-3">
      <a href="/docs" class="flex items-center gap-2">
        <span class="font-semibold">Entwickler-Dokumentation</span>
      </a>
    </div>
    <div class="flex items-center gap-3">
      <a href="/" class="flex items-center gap-2 text-sm text-theme-text-secondary hover:text-theme-text-primary transition-colors">
        <span class="hidden sm:inline">Zurück zur App</span>
      </a>
    </div>
  </header>
  <div class="flex flex-1 min-h-0">
    <aside class="hidden lg:flex flex-col w-72 shrink-0 border-r border-theme-sidebar-border p-4 overflow-y-auto">
      <nav aria-label="Docs" class="flex flex-col gap-4 h-full">
        <div class="flex flex-col gap-5 overflow-y-auto pr-1">
          ${sidebarHtml}
        </div>
      </nav>
    </aside>
    <main class="flex-1 min-w-0 overflow-y-auto px-4 md:px-10 py-8">
      <article class="mx-auto max-w-3xl lg:mx-0">
        <div class="flex items-center justify-between gap-4 mb-2">
          <p class="text-xs font-semibold uppercase tracking-wide text-theme-text-secondary">${escapeHtml(
            CATEGORY_LABELS[entry.category],
          )}</p>
          <a href="${GITHUB_DOCS_BASE}/${entry.source}" target="_blank" rel="noreferrer" class="flex items-center gap-1.5 text-xs text-theme-text-secondary hover:text-theme-text-primary transition-colors">
            <span>Auf GitHub bearbeiten</span>
          </a>
        </div>
        <div class="docs-markdown max-w-3xl">
          ${bodyHtml}
        </div>
        ${paginationHtml}
      </article>
    </main>
    ${
      tocHtml
        ? `<aside class="hidden lg:block w-60 xl:w-64 shrink-0 border-l border-theme-sidebar-border p-6 overflow-y-auto"><div class="sticky top-0">${tocHtml}</div></aside>`
        : ""
    }
  </div>
</div>`;
}

function main() {
  if (!fs.existsSync(CONTENT_DIR)) {
    console.error("[prerender-docs] Content directory not found:", CONTENT_DIR);
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  let rendered = 0;

  for (const entry of DOC_ENTRIES) {
    const contentPath = path.join(CONTENT_DIR, entry.file);
    if (!fs.existsSync(contentPath)) {
      console.warn("[prerender-docs] Skipping missing file:", entry.file);
      continue;
    }
    const html = renderPage(entry);
    const outPath = path.join(OUT_DIR, `${entry.slug}.html`);
    fs.writeFileSync(outPath, html);
    rendered++;
    console.log(`[prerender-docs] ${entry.slug} → ${outPath}`);
  }

  console.log(`[prerender-docs] ✓ Rendered ${rendered} docs pages.`);
}

main();
