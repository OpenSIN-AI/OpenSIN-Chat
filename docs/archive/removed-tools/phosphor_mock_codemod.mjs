#!/usr/bin/env node
// SPDX-License-Identifier: MIT
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, dirname } from "node:path";

const ROOT = process.argv[2] || "frontend/src";

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) yield* walk(full);
    else if (/\.(test|spec)\.[jt]sx?$/.test(entry)) yield full;
  }
}

function findFile(resolved) {
  const tryExtensions = [
    ".tsx",
    ".ts",
    ".jsx",
    ".js",
    "/index.tsx",
    "/index.ts",
    "/index.jsx",
    "/index.js",
  ];
  for (const ext of tryExtensions) {
    const candidate = resolved + ext;
    try {
      if (statSync(candidate).isFile()) return candidate;
    } catch (e) {}
    try {
      if (statSync(resolved).isDirectory()) return resolved + "/index" + ext;
    } catch (e) {}
  }
  return null;
}

function listSourceFilesRecursively(startFile) {
  const seen = new Set();
  const out = new Set();
  const queue = [startFile];
  while (queue.length) {
    const cur = queue.shift();
    if (!cur || seen.has(cur)) continue;
    seen.add(cur);
    try {
      const s = statSync(cur);
      if (!s.isFile()) continue;
    } catch {
      continue;
    }
    out.add(cur);
    let src;
    try {
      src = readFileSync(cur, "utf8");
    } catch {
      continue;
    }
    const re =
      /(?:import\s+[^"'\n]*?\sfrom\s+|require\(\s*)["']([^"']+?)["']/g;
    let m;
    while ((m = re.exec(src)) !== null) {
      const spec = m[1];
      if (spec.startsWith("@phosphor")) continue;
      if (!spec.startsWith(".") && !spec.startsWith("/") && !spec.startsWith("@/"))
        continue;
      let resolved;
      if (spec.startsWith("@/")) resolved = join(ROOT, spec.slice(2));
      else if (spec.startsWith("/")) resolved = join(ROOT, spec.slice(1));
      else resolved = findFile(join(dirname(cur), spec));
      if (!resolved) continue;
      queue.push(resolved);
    }
  }
  return [...out];
}

const MOCK_RE =
  /vi\.mock\(["']@phosphor-icons\/react["'],\s*\(\)\s*=>\s*\((\{[\s\S]*?\})\s*\)\s*\)/g;

function parseExistingMock(originalBlock) {
  const out = new Map();
  const trimmed = originalBlock.trim();
  const inner =
    trimmed.startsWith("{") && trimmed.endsWith("}")
      ? trimmed.slice(1, -1)
      : trimmed;
  const parts = [];
  let depth = 0;
  let buf = "";
  let inJsxBracket = 0;
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (ch === "<" && !inner.slice(i, i + 5).includes("//")) {
      inJsxBracket++;
      buf += ch;
      continue;
    }
    if (ch === ">" && inJsxBracket > 0) {
      inJsxBracket--;
      buf += ch;
      continue;
    }
    if (inJsxBracket === 0 && ch === "," && depth === 0) {
      if (buf.trim()) parts.push(buf.trim());
      buf = "";
      continue;
    }
    if (ch === "(" || ch === "{" || ch === "[") depth++;
    else if (ch === ")" || ch === "}" || ch === "]") depth--;
    buf += ch;
  }
  if (buf.trim()) parts.push(buf.trim());

  for (const p of parts) {
    const nameMatch = /^(\w+)\s*:/.exec(p);
    if (!nameMatch) continue;
    const tidMatch = /data-testid=["']([^"']+)["']/.exec(p);
    if (tidMatch) out.set(nameMatch[1], tidMatch[1]);
  }
  return out;
}

function collectAllIcons(srcFile) {
  const out = new Map();
  let text = "";
  try {
    text = readFileSync(srcFile, "utf8");
  } catch {
    return [];
  }
  const re =
    /import\s*\{([^}]+)\}\s*from\s*["']@phosphor-icons\/react\/dist\/csr\/([A-Za-z][\w$]*)["']/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const file = m[2];
    for (const spec of m[1].split(",").map((s) => s.trim())) {
      const cleaned = spec.replace(/\s+as\s+\w+$/, "");
      if (/^[A-Za-z][\w$]*$/.test(cleaned)) out.set(file, cleaned);
    }
  }
  return [...out.entries()];
}

let total = 0;
let changed = 0;
for (const file of walk(ROOT)) {
  total++;
  const src = readFileSync(file, "utf8");
  if (
    !src.includes('vi.mock("@phosphor-icons/react"') &&
    !src.includes("vi.mock('@phosphor-icons/react'")
  ) {
    continue;
  }
  const dir = file.replace(/\/[^/]+$/, "");
  const sourcesSet = new Set();
  for (const starter of [
    join(dir, "index.tsx"),
    join(dir, "index.ts"),
    join(dir, "index.jsx"),
    join(dir, "index.js"),
    file.replace(/\.test\.[jt]sx?$/, ".tsx"),
    file.replace(/\.test\.[jt]sx?$/, ".ts"),
    file.replace(/\.test\.[jt]sx?$/, ".jsx"),
    file.replace(/\.test\.[jt]sx?$/, ".js"),
  ]) {
    for (const f of listSourceFilesRecursively(starter))
      sourcesSet.add(f);
  }
  const sources = [...sourcesSet];

  const entries = new Map();
  for (const sf of sources) {
    for (const [iconFile, iconName] of collectAllIcons(sf)) {
      entries.set(iconFile, iconName);
    }
  }
  const existingTestIds = new Map();
  const matches = [...src.matchAll(MOCK_RE)];
  for (const m of matches) {
    for (const [name, tid] of parseExistingMock(m[1])) {
      existingTestIds.set(name, tid);
    }
  }
  const mockLines = [...entries.entries()].map(([iconFile, iconName]) => {
    const tid = existingTestIds.get(iconName);
    const component = tid
      ? `(props) => <svg data-testid="${tid}" {...props} />`
      : `(props) => <svg data-testid="phosphor-${iconName.toLowerCase()}-icon" {...props} />`;
    return `vi.mock("@phosphor-icons/react/dist/csr/${iconFile}", () => ({ default: ${component}, ${iconName}: ${component} }));`;
  });

  const next = src.replace(MOCK_RE, mockLines.join("\n"));
  if (next !== src) {
    writeFileSync(file, next);
    changed++;
    console.log(relative(process.cwd(), file));
  }
}
console.error(`\nUpdated phosphor mocks in ${changed}/${total} test files.`);
