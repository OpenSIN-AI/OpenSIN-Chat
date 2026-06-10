// SPDX-License-Identifier: MIT
/**
 * SBOM generator — produces SPDX 2.3 + CycloneDX 1.5 Software Bills of Materials
 * for every workspace in the repo (Issues #4 and #23, CEO Audit COMPL-SBOM).
 *
 * Docs: generate-sbom.doc.md
 *
 * Usage:
 *   node scripts/generate-sbom.cjs            # generate SBOMs into sbom/
 *   node scripts/generate-sbom.cjs --check    # CI: verify SBOMs exist & are valid
 *
 * Output (written to sbom/):
 *   sbom/<workspace>.spdx.json        SPDX 2.3 JSON
 *   sbom/<workspace>.cdx.json         CycloneDX 1.5 JSON
 *   sbom/index.json                   summary manifest (counts, generatedAt)
 *
 * Strategy:
 *   Parses lockfiles directly (yarn.lock v1 or npm package-lock v2/v3) so the
 *   SBOM can be produced deterministically in CI WITHOUT installing
 *   node_modules or hitting the network. Workspaces without a usable lockfile
 *   fall back to their package.json declared dependency ranges.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "sbom");
const NS = "https://opensin.delqhi.com/sbom";

const WORKSPACES = [
  { name: "root", dir: ROOT },
  { name: "server", dir: path.join(ROOT, "server") },
  { name: "frontend", dir: path.join(ROOT, "frontend") },
  { name: "collector", dir: path.join(ROOT, "collector") },
];

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

/** Parse a yarn.lock v1 file into a map of name -> { version }. */
function parseYarnLock(text) {
  const pkgs = new Map();
  const blocks = text.split(/\n(?=\S)/);
  for (const block of blocks) {
    const lines = block.split("\n");
    const header = lines[0];
    if (!header || header.startsWith("#") || header.startsWith("__metadata")) continue;
    const versionLine = lines.find((l) => /^\s+version:?\s+/.test(l) || /^\s+"?version"?\s/.test(l));
    if (!versionLine) continue;
    const version = versionLine.replace(/.*version:?\s+/, "").replace(/['"]/g, "").trim();
    // header may list several specifiers: "pkg@^1.0.0", pkg@~2:
    const specifiers = header.replace(/:\s*$/, "").split(",").map((s) => s.trim().replace(/^"|"$/g, ""));
    for (const spec of specifiers) {
      const at = spec.lastIndexOf("@");
      if (at <= 0) continue;
      const name = spec.slice(0, at);
      if (!pkgs.has(name)) pkgs.set(name, { name, version });
    }
  }
  return [...pkgs.values()];
}

/** Parse an npm package-lock v2/v3 into a list of { name, version }. */
function parseNpmLock(lock) {
  const out = new Map();
  if (lock.packages) {
    for (const [key, val] of Object.entries(lock.packages)) {
      if (!key || !key.includes("node_modules")) continue;
      const name = key.slice(key.lastIndexOf("node_modules/") + "node_modules/".length);
      if (val.version) out.set(name, { name, version: val.version });
    }
  } else if (lock.dependencies) {
    const walk = (deps) => {
      for (const [name, val] of Object.entries(deps)) {
        if (val.version) out.set(name, { name, version: val.version });
        if (val.dependencies) walk(val.dependencies);
      }
    };
    walk(lock.dependencies);
  }
  return [...out.values()];
}

/** Resolve dependency list for a workspace from the best available source. */
function resolveDeps(dir) {
  const yarnLock = path.join(dir, "yarn.lock");
  const npmLock = path.join(dir, "package-lock.json");
  if (fs.existsSync(npmLock)) {
    try {
      const deps = parseNpmLock(readJSON(npmLock));
      if (deps.length) return { source: "package-lock.json", deps };
    } catch (_) {}
  }
  if (fs.existsSync(yarnLock)) {
    const deps = parseYarnLock(fs.readFileSync(yarnLock, "utf8"));
    if (deps.length) return { source: "yarn.lock", deps };
  }
  // Fallback: declared ranges from package.json
  const pkg = readJSON(path.join(dir, "package.json"));
  const deps = [];
  for (const field of ["dependencies", "devDependencies"]) {
    for (const [name, range] of Object.entries(pkg[field] || {})) {
      deps.push({ name, version: String(range).replace(/^[\^~>=<\s]+/, "") });
    }
  }
  return { source: "package.json", deps };
}

function spdxId(name, version) {
  return "SPDXRef-Package-" + `${name}-${version}`.replace(/[^a-zA-Z0-9.-]/g, "-");
}

function purl(name, version) {
  // pkg:npm/@scope/name@version
  const encoded = name.startsWith("@")
    ? "@" + encodeURIComponent(name.slice(1)).replace("%2F", "/")
    : encodeURIComponent(name);
  return `pkg:npm/${encoded}@${version}`;
}

function buildSpdx(wsName, pkgMeta, deps) {
  const now = new Date().toISOString();
  const docName = `opensin-chat-${wsName}`;
  const packages = deps.map((d) => ({
    name: d.name,
    SPDXID: spdxId(d.name, d.version),
    versionInfo: d.version,
    downloadLocation: "NOASSERTION",
    filesAnalyzed: false,
    licenseConcluded: "NOASSERTION",
    licenseDeclared: "NOASSERTION",
    supplier: "NOASSERTION",
    externalRefs: [
      {
        referenceCategory: "PACKAGE-MANAGER",
        referenceType: "purl",
        referenceLocator: purl(d.name, d.version),
      },
    ],
  }));
  const rootId = spdxId(pkgMeta.name || docName, pkgMeta.version || "0.0.0");
  return {
    spdxVersion: "SPDX-2.3",
    dataLicense: "CC0-1.0",
    SPDXID: "SPDXRef-DOCUMENT",
    name: docName,
    documentNamespace: `${NS}/${docName}-${crypto.randomUUID()}`,
    creationInfo: {
      created: now,
      creators: ["Tool: openafd-generate-sbom", "Organization: Family-Team-Projects"],
      licenseListVersion: "3.22",
    },
    packages: [
      {
        name: pkgMeta.name || docName,
        SPDXID: rootId,
        versionInfo: pkgMeta.version || "0.0.0",
        downloadLocation: "NOASSERTION",
        filesAnalyzed: false,
        licenseConcluded: pkgMeta.license || "MIT",
        licenseDeclared: pkgMeta.license || "MIT",
      },
      ...packages,
    ],
    relationships: [
      { spdxElementId: "SPDXRef-DOCUMENT", relationshipType: "DESCRIBES", relatedSpdxElement: rootId },
      ...packages.map((p) => ({
        spdxElementId: rootId,
        relationshipType: "DEPENDS_ON",
        relatedSpdxElement: p.SPDXID,
      })),
    ],
  };
}

function buildCycloneDx(wsName, pkgMeta, deps) {
  return {
    bomFormat: "CycloneDX",
    specVersion: "1.5",
    serialNumber: `urn:uuid:${crypto.randomUUID()}`,
    version: 1,
    metadata: {
      timestamp: new Date().toISOString(),
      tools: [{ vendor: "Family-Team-Projects", name: "openafd-generate-sbom", version: "1.0.0" }],
      component: {
        type: "application",
        name: pkgMeta.name || `opensin-chat-${wsName}`,
        version: pkgMeta.version || "0.0.0",
        licenses: [{ license: { id: pkgMeta.license || "MIT" } }],
      },
    },
    components: deps.map((d) => ({
      type: "library",
      name: d.name,
      version: d.version,
      purl: purl(d.name, d.version),
      "bom-ref": purl(d.name, d.version),
    })),
  };
}

function generate() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  const manifest = { generatedAt: new Date().toISOString(), specs: { spdx: "SPDX-2.3", cyclonedx: "1.5" }, workspaces: [] };

  for (const ws of WORKSPACES) {
    const pkgPath = path.join(ws.dir, "package.json");
    if (!fs.existsSync(pkgPath)) continue;
    const pkgMeta = readJSON(pkgPath);
    const { source, deps } = resolveDeps(ws.dir);

    const spdx = buildSpdx(ws.name, pkgMeta, deps);
    const cdx = buildCycloneDx(ws.name, pkgMeta, deps);
    const spdxFile = path.join(OUT_DIR, `${ws.name}.spdx.json`);
    const cdxFile = path.join(OUT_DIR, `${ws.name}.cdx.json`);
    fs.writeFileSync(spdxFile, JSON.stringify(spdx, null, 2));
    fs.writeFileSync(cdxFile, JSON.stringify(cdx, null, 2));

    manifest.workspaces.push({
      name: ws.name,
      source,
      packageCount: deps.length,
      spdx: path.relative(ROOT, spdxFile),
      cyclonedx: path.relative(ROOT, cdxFile),
    });
    console.log(`[sbom] ${ws.name}: ${deps.length} packages (from ${source})`);
  }

  fs.writeFileSync(path.join(OUT_DIR, "index.json"), JSON.stringify(manifest, null, 2));
  console.log(`[sbom] wrote manifest -> ${path.relative(ROOT, path.join(OUT_DIR, "index.json"))}`);
}

function check() {
  if (!fs.existsSync(OUT_DIR)) {
    console.error("[sbom] sbom/ directory missing — run `node scripts/generate-sbom.cjs`");
    process.exit(1);
  }
  const files = fs.readdirSync(OUT_DIR).filter((f) => f.endsWith(".json"));
  if (files.length === 0) {
    console.error("[sbom] no SBOM files found in sbom/");
    process.exit(1);
  }
  let bad = 0;
  for (const f of files) {
    try {
      const doc = readJSON(path.join(OUT_DIR, f));
      if (f.endsWith(".spdx.json") && doc.spdxVersion !== "SPDX-2.3") {
        console.error(`[sbom] ${f}: unexpected spdxVersion`);
        bad++;
      }
      if (f.endsWith(".cdx.json") && doc.bomFormat !== "CycloneDX") {
        console.error(`[sbom] ${f}: not a CycloneDX document`);
        bad++;
      }
    } catch {
      console.error(`[sbom] invalid JSON: ${f}`);
      bad++;
    }
  }
  if (bad > 0) process.exit(1);
  console.log(`[sbom] OK — ${files.length} valid SBOM file(s).`);
}

if (process.argv.includes("--check")) check();
else generate();
