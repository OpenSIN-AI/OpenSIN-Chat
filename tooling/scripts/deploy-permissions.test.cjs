// SPDX-License-Identifier: MIT
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "../..");
const PERMISSION_COMMAND = '"${compose[@]}" run --rm --no-deps fix-permissions';

for (const relativePath of [
  "tooling/scripts/deploy-production.sh",
  "tooling/scripts/auto-deploy.sh",
]) {
  test(`${relativePath} normalizes bind-mount ownership before rollout`, () => {
    const script = fs.readFileSync(path.join(ROOT, relativePath), "utf8");
    const permissionIndex = script.indexOf(PERMISSION_COMMAND);
    const buildIndex = script.indexOf('"${compose[@]}" build');
    const startIndex = script.indexOf('"${compose[@]}" up -d --no-deps');

    assert.notEqual(
      permissionIndex,
      -1,
      `${relativePath} must run the Compose fix-permissions service explicitly`,
    );
    assert.ok(
      buildIndex === -1 || permissionIndex < buildIndex,
      `${relativePath} must normalize ownership before building`,
    );
    assert.ok(
      startIndex === -1 || permissionIndex < startIndex,
      `${relativePath} must normalize ownership before starting the app with --no-deps`,
    );
  });
}
