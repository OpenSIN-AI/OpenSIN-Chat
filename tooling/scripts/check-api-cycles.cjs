#!/usr/bin/env node
// SPDX-License-Identifier: MIT
const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");

function normalizeCycle(cycle) {
  const values = cycle.map(String);
  if (values.length === 0) return "";
  const rotations = values.map((_, index) =>
    values.slice(index).concat(values.slice(0, index)).join(" -> "),
  );
  rotations.sort();
  return rotations[0];
}

function compareCycles(currentCycles, baselineCycles) {
  const current = new Set(currentCycles.map(normalizeCycle));
  const baseline = new Set(baselineCycles.map(normalizeCycle));
  return {
    newCycles: [...current].filter((cycle) => !baseline.has(cycle)).sort(),
    resolvedCycles: [...baseline].filter((cycle) => !current.has(cycle)).sort(),
    currentCount: current.size,
    baselineCount: baseline.size,
  };
}

async function collectCycles(repositoryRoot) {
  const apiRoot = path.join(repositoryRoot, "apps", "api");
  const apiRequire = createRequire(path.join(apiRoot, "package.json"));
  const madge = apiRequire("madge");
  const graph = await madge(apiRoot, {
    fileExtensions: ["js"],
    excludeRegExp: [/node_modules|__tests__|__mocks__/],
  });
  return graph.circular();
}

async function main() {
  const repositoryRoot = path.resolve(__dirname, "..", "..");
  const baselinePath = path.join(
    repositoryRoot,
    "tooling",
    "baselines",
    "api-circular-dependencies.json",
  );
  const baselineDocument = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
  const currentCycles = await collectCycles(repositoryRoot);
  const result = compareCycles(currentCycles, baselineDocument.cycles || []);

  console.log(
    `API circular dependencies: ${result.currentCount} current, ${result.baselineCount} reviewed baseline.`,
  );

  if (result.resolvedCycles.length > 0) {
    console.log(`Resolved baseline cycles (${result.resolvedCycles.length}):`);
    for (const cycle of result.resolvedCycles) console.log(`  - ${cycle}`);
    console.log("Update the baseline in a dedicated cleanup change after review.");
  }

  if (result.newCycles.length > 0) {
    console.error(`New unreviewed cycles (${result.newCycles.length}):`);
    for (const cycle of result.newCycles) console.error(`  - ${cycle}`);
    process.exitCode = 1;
    return;
  }

  console.log("No new circular dependencies introduced.");
}

module.exports = { normalizeCycle, compareCycles, collectCycles };

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
