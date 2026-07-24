#!/usr/bin/env node
// SPDX-License-Identifier: MIT

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");
const errors = [];

const REQUIRED_ROOT_DIRS = [
  "apps",
  "packages",
  "platform",
  "tooling",
  "docs",
  "tests",
];

const FORBIDDEN_ROOT_DIRS = [
  "frontend",
  "server",
  "collector",
  "docker",
  "docker-opensin",
  "scripts",
  "screenshots",
  "public",
  "images",
  "locales",
  "storage",
  "sbom",
  "graphify-out",
  "n8n",
  "ci",
  "extras",
  "assets",
];

const REQUIRED_APPS = ["api", "web", "worker"];
const ALLOWED_ROOT_DIRS = new Set([
  ...REQUIRED_ROOT_DIRS,
  ".git",
  ".github",
  ".claude",
  ".codex",
  ".local",
  ".sin",
  ".sin-gpt-web",
  "node_modules",
]);
const SKIP_DIRS = new Set([
  ".git",
  ".local",
  ".claude",
  ".codex",
  ".sin",
  ".sin-gpt-web",
  "node_modules",
  "dist",
  "coverage",
  "test-results",
  "archive",
  "artifacts",
]);
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath));
}

for (const dir of REQUIRED_ROOT_DIRS) {
  if (!exists(dir)) errors.push(`Missing required root directory: ${dir}/`);
}

for (const dir of FORBIDDEN_ROOT_DIRS) {
  if (exists(dir)) errors.push(`Legacy root directory must not return: ${dir}/`);
}

for (const entry of fs.readdirSync(ROOT, { withFileTypes: true })) {
  if (entry.isDirectory() && !ALLOWED_ROOT_DIRS.has(entry.name)) {
    errors.push(`Unexpected root directory: ${entry.name}/`);
  }
}

for (const app of REQUIRED_APPS) {
  const manifest = path.join("apps", app, "package.json");
  if (!exists(manifest)) errors.push(`Missing application manifest: ${manifest}`);
}

if (!exists("yarn.lock")) errors.push("Root yarn.lock is required.");

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    const relativePath = path.relative(ROOT, absolutePath);

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      if (entry.name === ".sin-code") {
        errors.push(`Agent index found in active tree: ${relativePath}`);
        continue;
      }
      walk(absolutePath);
      continue;
    }

    if (entry.name === "yarn.lock" && relativePath !== "yarn.lock") {
      errors.push(`Nested lockfile found: ${relativePath}`);
    }

    const extension = path.extname(entry.name).toLowerCase();
    if (IMAGE_EXTENSIONS.has(extension)) {
      const size = fs.statSync(absolutePath).size;
      if (size <= 1) errors.push(`Empty image artifact found: ${relativePath}`);
    }
  }
}

walk(ROOT);

if (errors.length > 0) {
  console.error("Repository layout check failed:\n");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Repository layout check passed.");
console.log(`Canonical areas: ${REQUIRED_ROOT_DIRS.join(", ")}`);
