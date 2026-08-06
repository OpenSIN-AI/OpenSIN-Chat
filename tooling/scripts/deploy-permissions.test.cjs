// SPDX-License-Identifier: MIT
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "../..");
const PERMISSION_COMMAND =
  '"${compose[@]}" run -T --rm --no-deps fix-permissions';

for (const relativePath of [
  "tooling/scripts/deploy-production.sh",
  "tooling/scripts/auto-deploy.sh",
]) {
  test(`${relativePath} isolates bind-mount permission repair from deploy stdin before rollout`, () => {
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

test("deploy-production forwards an explicit Compose project name", () => {
  const script = fs.readFileSync(
    path.join(ROOT, "tooling/scripts/deploy-production.sh"),
    "utf8",
  );

  assert.match(script, /COMPOSE_PROJECT_NAME="\$\{COMPOSE_PROJECT_NAME:-\}"/);
  assert.match(
    script,
    /"\$\{PUBLIC_HEALTH_URL\}" \\\n  "\$\{COMPOSE_PROJECT_NAME\}" <<'REMOTE_SCRIPT'/,
  );
  assert.match(
    script,
    /export COMPOSE_PROJECT_NAME="\$\{compose_project_name\}"/,
  );
});

test("deployment propagates immutable commit metadata into the image and runtime", () => {
  const compose = fs.readFileSync(
    path.join(ROOT, "platform/containers/compose/docker-compose.yml"),
    "utf8",
  );

  assert.equal(
    (compose.match(/APP_VERSION: "\$\{APP_VERSION:-dev\}"/g) || []).length,
    2,
    "APP_VERSION must be present in both build args and runtime environment",
  );
  assert.equal(
    (compose.match(/GIT_SHA: "\$\{GIT_SHA:-unknown\}"/g) || []).length,
    2,
    "GIT_SHA must be present in both build args and runtime environment",
  );

  for (const relativePath of [
    "tooling/scripts/deploy-production.sh",
    "tooling/scripts/auto-deploy.sh",
  ]) {
    const script = fs.readFileSync(path.join(ROOT, relativePath), "utf8");
    assert.match(script, /export APP_VERSION="\$\{APP_VERSION:-\$\{short_sha\}\}"/);
    assert.match(script, /export GIT_SHA="\$\{target_sha\}"/);
  }
});
