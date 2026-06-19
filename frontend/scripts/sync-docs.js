#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Sync curated docs from ../../docs/ into src/pages/Docs/content/
 * This ensures the frontend bundle has the latest documentation.
 * Runs as predev/prebuild hook to keep docs in sync automatically.
 */

const DOCS_SOURCE = path.join(__dirname, "../..", "docs");
const CONTENT_DEST = path.join(__dirname, "../src/pages/Docs/content");

/**
 * Curated files that should be included in the in-app documentation.
 * Excludes internal planning/audit docs (PLAN-*, AGENT-*, CEO-AUDIT, etc.)
 */
const CURATED_FILES = [
  { src: "USER-GUIDE.md", dst: "user-guide.md" },
  { src: "API.md", dst: "api.md" },
  { src: "architecture.md", dst: "architecture.md" },
  { src: "DATA-SOURCES.md", dst: "data-sources.md" },
  { src: "SYNC-RUNBOOK.md", dst: "sync-runbook.md" },
  { src: "UPSTREAM-SYNC.md", dst: "upstream-sync.md" },
  { src: "DOCKER-DEPLOYMENT.md", dst: "docker-deployment.md" },
  { src: "OPENSIN-CHAT-DEPLOYMENT.md", dst: "opensin-chat-deployment.md" },
  { src: "AUTO-DEPLOY.md", dst: "auto-deploy.md" },
  { src: "vercel-deploy-fix.md", dst: "vercel-deploy-fix.md" },
  { src: "ssh-remote-tunnel.md", dst: "ssh-remote-tunnel.md" },
  { src: "supabase-self-hosted.md", dst: "supabase-self-hosted.md" },
];

const ADR_FILES = [
  { src: "adr/ADR-001-persistent-job-queue.md", dst: "adr-001-persistent-job-queue.md" },
  { src: "adr/README.md", dst: "adr-overview.md" },
];

try {
  if (process.env.SKIP_DOC_SYNC === "1") {
    console.log("[docs-sync] SKIP_DOC_SYNC=1 — skipping doc sync.");
    process.exit(0);
  }
  // Ensure content directory exists
  if (!fs.existsSync(CONTENT_DEST)) {
    fs.mkdirSync(CONTENT_DEST, { recursive: true });
    console.log(`[docs-sync] Created ${CONTENT_DEST}`);
  }

  let copied = 0;

  const allFiles = [...CURATED_FILES, ...ADR_FILES];
  const expected = new Set(allFiles.map(({ dst }) => dst));

  // Remove any stale markdown files that are no longer part of the curated
  // set. This is critical: leftover files (e.g. uppercase variants like
  // API.md alongside api.md) collide on case-insensitive filesystems such as
  // macOS, where Vite's glob registers only one casing and the manifest's
  // lowercase lookup then resolves to null → "page not found".
  for (const existing of fs.readdirSync(CONTENT_DEST)) {
    if (!existing.endsWith(".md")) continue;
    if (!expected.has(existing)) {
      fs.rmSync(path.join(CONTENT_DEST, existing));
      console.log(`[docs-sync] Removed stale ${existing}`);
    }
  }

  // Copy curated files
  for (const { src, dst } of allFiles) {
    const srcPath = path.join(DOCS_SOURCE, src);
    const dstPath = path.join(CONTENT_DEST, dst);

    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, dstPath);
      console.log(`[docs-sync] Copied ${src} → ${dst}`);
      copied++;
    } else {
      console.warn(`[docs-sync] WARNING: ${srcPath} not found, skipping.`);
    }
  }

  console.log(`[docs-sync] ✓ Successfully synced ${copied} files.`);
} catch (err) {
  console.error("[docs-sync] ERROR:", err.message);
  process.exit(1);
}
