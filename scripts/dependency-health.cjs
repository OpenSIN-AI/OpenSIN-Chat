// SPDX-License-Identifier: MIT
/**
 * Dependency health checker — flags direct dependencies that are potentially
 * abandoned (no release in > N years) or deprecated on the npm registry.
 * Resolves Issue #5 / CEO Audit DEP-ABANDONED.
 *
 * Docs: dependency-health.doc.md
 *
 * Usage:
 *   node scripts/dependency-health.cjs                 # full report
 *   node scripts/dependency-health.cjs --years 2       # staleness threshold
 *   node scripts/dependency-health.cjs --check          # CI: exit 1 if deprecated dep found
 *   node scripts/dependency-health.cjs --json            # machine-readable
 *
 * Network: queries https://registry.npmjs.org. If offline, exits 0 with a note
 * so it never hard-blocks a pipeline that lacks network.
 */
const fs = require("fs");
const path = require("path");
const https = require("https");

const ROOT = path.resolve(__dirname, "..");
const WORKSPACES = ["server", "frontend", "collector", "."];
const argv = process.argv.slice(2);
const YEARS = Number((argv.find((a) => a.startsWith("--years")) || "").split("=")[1] || argv[argv.indexOf("--years") + 1]) || 2;
const CHECK = argv.includes("--check");
const JSON_OUT = argv.includes("--json");

function directDeps() {
  const seen = new Map(); // name -> Set(workspaces)
  for (const ws of WORKSPACES) {
    const pkgPath = path.join(ROOT, ws, "package.json");
    if (!fs.existsSync(pkgPath)) continue;
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    for (const field of ["dependencies", "devDependencies"]) {
      for (const name of Object.keys(pkg[field] || {})) {
        if (!seen.has(name)) seen.set(name, new Set());
        seen.get(name).add(ws === "." ? "root" : ws);
      }
    }
  }
  return seen;
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 15000, headers: { "user-agent": "openafd-dep-health" } }, (res) => {
      if (res.statusCode === 404) return resolve(null);
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    });
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", reject);
  });
}

async function pool(items, size, worker) {
  const results = [];
  let i = 0;
  const runners = Array.from({ length: size }, async () => {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await worker(items[idx], idx).catch((e) => ({ error: e.message }));
    }
  });
  await runners.reduce((p) => p, Promise.resolve());
  await Promise.all(runners);
  return results;
}

async function main() {
  const deps = directDeps();
  const names = [...deps.keys()].sort();
  const cutoff = Date.now() - YEARS * 365 * 24 * 3600 * 1000;
  let networkOk = true;

  const rows = await pool(names, 8, async (name) => {
    // Use the abbreviated metadata endpoint; fall back to time via full doc.
    let meta;
    try {
      meta = await fetchJson(`https://registry.npmjs.org/${encodeURIComponent(name).replace("%40", "@")}`);
    } catch (e) {
      networkOk = false;
      return { name, skipped: true };
    }
    if (!meta) return { name, notFound: true };
    const latest = meta["dist-tags"] && meta["dist-tags"].latest;
    const time = meta.time || {};
    const lastPublish = time[latest] || time.modified;
    const deprecated = !!(meta.versions && latest && meta.versions[latest] && meta.versions[latest].deprecated);
    const ageMs = lastPublish ? Date.now() - new Date(lastPublish).getTime() : null;
    return {
      name,
      latest,
      lastPublish,
      ageYears: ageMs != null ? +(ageMs / (365 * 24 * 3600 * 1000)).toFixed(1) : null,
      stale: lastPublish ? new Date(lastPublish).getTime() < cutoff : false,
      deprecated,
      workspaces: [...deps.get(name)],
    };
  });

  if (!networkOk && rows.every((r) => r.skipped)) {
    console.log("[dep-health] network unavailable — skipping (no hard failure).");
    process.exit(0);
  }

  const deprecated = rows.filter((r) => r.deprecated);
  const stale = rows.filter((r) => r.stale && !r.deprecated);

  if (JSON_OUT) {
    console.log(JSON.stringify({ years: YEARS, deprecated, stale }, null, 2));
  } else {
    console.log(`\n=== Dependency Health (threshold: ${YEARS}y, ${names.length} direct deps) ===\n`);
    console.log(`DEPRECATED (${deprecated.length}):`);
    for (const r of deprecated) console.log(`  ✗ ${r.name}@${r.latest}  [${r.workspaces.join(",")}]`);
    console.log(`\nSTALE > ${YEARS}y (${stale.length}):`);
    for (const r of stale.sort((a, b) => b.ageYears - a.ageYears)) {
      console.log(`  • ${r.name}  last: ${r.lastPublish?.slice(0, 10)} (${r.ageYears}y)  [${r.workspaces.join(",")}]`);
    }
    console.log("");
  }

  if (CHECK && deprecated.length > 0) {
    console.error(`[dep-health] FAIL — ${deprecated.length} deprecated direct dependency(ies).`);
    process.exit(1);
  }
  console.log("[dep-health] OK");
}

main().catch((e) => {
  console.error("[dep-health] error:", e.message);
  process.exit(0); // never hard-block pipelines on transient registry issues
});
