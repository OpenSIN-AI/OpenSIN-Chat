// SPDX-License-Identifier: MIT
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "../..");

test("systemd unit creates its volatile writable runtime directory", () => {
  const unit = fs.readFileSync(
    path.join(ROOT, "tooling/scripts/com.opensintunnel.healthcheck.service"),
    "utf8",
  );

  assert.match(unit, /^RuntimeDirectory=opensin-tunnel-healthcheck$/m);
  assert.match(unit, /^RuntimeDirectoryMode=0755$/m);
  assert.match(unit, /^RuntimeDirectoryPreserve=yes$/m);
  assert.match(unit, /^ReadWritePaths=.*\/run\/opensin-tunnel-healthcheck$/m);
});

test("installer verifies the oneshot health service before reporting success", () => {
  const installer = fs.readFileSync(
    path.join(ROOT, "tooling/scripts/install-launchd-healthcheck.sh"),
    "utf8",
  );
  const timerStart = installer.indexOf('systemctl start "$TIMER_NAME.timer"');
  const serviceStart = installer.indexOf(
    'systemctl start "$SERVICE_NAME.service"',
  );

  assert.notEqual(timerStart, -1);
  assert.ok(serviceStart > timerStart);
});

test("healthcheck rejects cloudflared debug logging that can expose credentials", () => {
  const script = fs.readFileSync(
    path.join(ROOT, "tooling/scripts/tunnel-health-check-launchd.sh"),
    "utf8",
  );

  assert.match(script, /systemctl show --property=ExecStart --value/);
  assert.match(script, /--log-\?level/);
  assert.match(
    script,
    /unsafe debug logging that can expose request credentials/,
  );
});
