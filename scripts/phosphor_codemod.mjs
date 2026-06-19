#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import process from "node:process";

const ROOT = process.argv[2] || "frontend/src";
const ts = await import("typescript");
const { ScriptTarget, ScriptKind, SyntaxKind } = ts.default ?? ts;

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) yield* walk(full);
    else if (/\.(tsx?|jsx?)$/.test(entry)) yield full;
  }
}

function getIndent(sourceFile, position) {
  const text = sourceFile.text;
  const leading = text.slice(0, position);
  const lastNl = leading.lastIndexOf("\n");
  const lineStart = lastNl + 1;
  return text.slice(lineStart, position).match(/^[ \t]*/)[0] ?? "";
}

function buildReplacement(importDecl, sourceFile) {
  const sb = [];
  const indent = getIndent(sourceFile, importDecl.getStart());

  if (!importDecl.importClause || !importDecl.importClause.namedBindings) {
    return null;
  }
  const named = importDecl.importClause.namedBindings;
  if (named.kind !== SyntaxKind.NamedImports) return null;

  const declIsTypeOnly = !!(importDecl.importClause.isTypeOnly);
  const typeOnlyImports = [];
  const valueOnlyImports = [];

  for (const spec of named.elements) {
    const name = spec.propertyName ? spec.propertyName.text : spec.name.text;
    const local = spec.name.text;
    const specIsTypeOnly = !!(spec.isTypeOnly);
    const isType =
      declIsTypeOnly || specIsTypeOnly || /^(?:Icon|IconProps|IconWeight)$/.test(name);
    const rendered =
      name === local ? name : `${name} as ${local}`;
    if (isType) {
      typeOnlyImports.push(rendered);
    } else {
      valueOnlyImports.push(rendered);
    }
  }

  if (valueOnlyImports.length) {
    const groups = new Map();
    for (const r of valueOnlyImports) {
      const original = r.replace(/\s+as\s+\w+$/, "");
      const local = r;
      if (!groups.has(original)) groups.set(original, []);
      groups.get(original).push(local);
    }
    for (const [original, locals] of groups) {
      for (const local of locals) {
        sb.push(
          `${indent}import { ${local} } from "@phosphor-icons/react/dist/csr/${original}";`,
        );
      }
    }
  }
  if (typeOnlyImports.length) {
    sb.push(
      `${indent}import type { ${typeOnlyImports.join(", ")} } from "@phosphor-icons/react/dist/lib/types";`,
    );
  }
  return sb.join("\n");
}

function processFile(path) {
  const src = readFileSync(path, "utf8");
  if (!src.includes("@phosphor-icons/react")) return 0;
  const sf = ts.default.createSourceFile(
    path,
    src,
    ScriptTarget.Latest,
    true,
    path.endsWith(".tsx") || path.endsWith(".jsx")
      ? ScriptKind.TSX
      : ScriptKind.TS,
  );
  let out = "";
  let cursor = 0;
  let edits = 0;

  const visits = [];
  function visit(node) {
    if (node.kind === SyntaxKind.ImportDeclaration) {
      const specText = node.moduleSpecifier.getText(sf).replace(/['"]/g, "");
      if (specText === "@phosphor-icons/react") {
        visits.push(node);
      }
    }
    ts.default.forEachChild(node, visit);
  }
  visit(sf);

  for (const decl of visits) {
    const replacement = buildReplacement(decl, sf);
    if (!replacement) continue;
    out += src.slice(cursor, decl.getStart());
    out += replacement;
    cursor = decl.getEnd();
    edits++;
  }
  out += src.slice(cursor);
  if (edits > 0) writeFileSync(path, out);
  return edits;
}

let total = 0;
let changed = 0;
let editsTotal = 0;
for (const file of walk(ROOT)) {
  total++;
  const edits = processFile(file);
  if (edits > 0) {
    changed++;
    editsTotal += edits;
    console.log(relative(process.cwd(), file), `(${edits})`);
  }
}
console.error(`\nCodemod applied to ${changed}/${total} files (${editsTotal} imports split).`);
