// Deep-merges duplicate keys in a locale TRANSLATIONS object literal.
// When two properties share a key:
//   - object + object  => recurse (union of keys)
//   - everything else  => keep the FIRST (earlier) value
// This preserves the most complete translation set while removing the
// duplicate-key shadowing that was hiding entire subtrees.
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import _generate from "@babel/generator";
import { readFileSync, writeFileSync } from "node:fs";

const traverse = _traverse.default || _traverse;
const generate = _generate.default || _generate;

const file = process.argv[2];
if (!file) {
  console.error("usage: node dedupe-locale.mjs <file>");
  process.exit(1);
}

const code = readFileSync(file, "utf8");
const ast = parse(code, { sourceType: "module" });

function keyName(prop) {
  if (!prop.key) return null;
  if (prop.key.type === "Identifier") return prop.key.name;
  if (prop.key.type === "StringLiteral") return prop.key.value;
  return null;
}

// Recursively dedupe an ObjectExpression's properties in place.
function dedupeObject(objExpr) {
  const byKey = new Map();
  const order = [];

  for (const prop of objExpr.properties) {
    if (prop.type !== "ObjectProperty") {
      order.push({ raw: prop });
      continue;
    }
    const name = keyName(prop);
    if (name === null) {
      order.push({ raw: prop });
      continue;
    }
    if (!byKey.has(name)) {
      byKey.set(name, prop);
      order.push({ key: name });
    } else {
      // duplicate: merge into the existing prop
      const existing = byKey.get(name);
      if (
        existing.value.type === "ObjectExpression" &&
        prop.value.type === "ObjectExpression"
      ) {
        // append the later block's properties, then dedupe recursively
        existing.value.properties.push(...prop.value.properties);
      }
      // primitive duplicate => keep first (do nothing)
    }
  }

  // Recurse into nested objects after merging
  for (const prop of byKey.values()) {
    if (prop.value.type === "ObjectExpression") {
      dedupeObject(prop.value);
    }
  }

  // Rebuild properties list preserving first-seen order
  const seen = new Set();
  const newProps = [];
  for (const entry of order) {
    if (entry.raw) {
      newProps.push(entry.raw);
    } else if (!seen.has(entry.key)) {
      seen.add(entry.key);
      newProps.push(byKey.get(entry.key));
    }
  }
  objExpr.properties = newProps;
}

let rootObj = null;
traverse(ast, {
  VariableDeclarator(path) {
    if (path.node.id.name === "TRANSLATIONS") {
      rootObj = path.node.init;
      path.stop();
    }
  },
});

if (!rootObj || rootObj.type !== "ObjectExpression") {
  console.error("Could not find TRANSLATIONS object literal");
  process.exit(1);
}

dedupeObject(rootObj);

const output = generate(ast, {
  retainLines: false,
  jsescOption: { minimal: true },
}).code;

writeFileSync(file, output, "utf8");
console.log("Deduped:", file);
