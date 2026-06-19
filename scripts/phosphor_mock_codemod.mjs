#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = "/Users/jeremy/dev/OpenSIN-Chat/frontend/src";

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) yield* walk(full);
    else if (/\.(test|spec)\.[jt]sx?$/.test(entry)) yield full;
  }
}

function listSiblingSources(testFile) {
  const dir = testFile.replace(/\/[^/]+$/, "");
  const out = new Set();
  for (const f of [
    join(dir, "..", "index.tsx"),
    join(dir, "..", "index.ts"),
    join(dir, "..", "index.jsx"),
    join(dir, "..", "index.js"),
    join(dir, "index.tsx"),
    join(dir, "index.ts"),
    join(dir, "index.jsx"),
    join(dir, "index.js"),
    testFile.replace(/\.test\.[jt]sx?$/, ".tsx"),
    testFile.replace(/\.test\.[jt]sx?$/, ".ts"),
    testFile.replace(/\.test\.[jt]sx?$/, ".jsx"),
    testFile.replace(/\.test\.[jt]sx?$/, ".js"),
  ]) {
    out.add(f);
  }
  return [...out];
}

const MOCK_RE =
  /vi\.mock\(["']@phosphor-icons\/react["'],\s*\(\)\s*=>\s*\((\{[\s\S]*?\})\s*\)\s*\)/g;

function parseExistingMock(originalBlock) {
  const out = new Map();
  const trimmed = originalBlock.trim();
  const inner = trimmed.startsWith("{") && trimmed.endsWith("}") ? trimmed.slice(1, -1) : trimmed;
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
  const sources = listSiblingSources(file);
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
