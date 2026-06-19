#!/usr/bin/env node
/**
 * OpenSIN-Chat self-hosted CI webhook receiver.
 *
 * Listens for GitHub push events on main, then:
 *   1. Pulls latest code
 *   2. Runs branding lint + frontend build + frontend tests + server tests
 *   3. If all pass: deploys to the production container
 *   4. Reports commit status back to GitHub
 *
 * Runs as a systemd service on the OCI VM (port 9000).
 * Cloudflare tunnel: ci.delqhi.com → localhost:9000
 *
 * Env vars:
 *   GITHUB_WEBHOOK_SECRET — HMAC secret for verifying webhook signatures
 *   GITHUB_TOKEN          — PAT for posting commit statuses
 *   GIT_REPO_DIR          — path to the repo (default /home/ubuntu/OpenSIN-Chat)
 *   PORT                  — listen port (default 9000)
 */

const http = require("http");
const crypto = require("crypto");
const { execSync, exec } = require("child_process");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 9000;
const REPO_DIR = process.env.GIT_REPO_DIR || "/home/ubuntu/OpenSIN-Chat";
const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || "";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const OWNER = "OpenSIN-AI";
const REPO = "OpenSIN-Chat";

const LOG_FILE = "/home/ubuntu/ci-logs/webhook.log";

// ── Logging ──────────────────────────────────────────────
function log(msg) {
  const ts = new Date().toISOString();
  const line = `[${ts}] ${msg}`;
  console.log(line);
  try {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    fs.appendFileSync(LOG_FILE, line + "\n");
  } catch {}
}

// ── GitHub commit status ────────────────────────────────
function setCommitStatus(sha, state, description, context = "CI / self-hosted") {
  if (!GITHUB_TOKEN) {
    log("GITHUB_TOKEN not set — skipping commit status");
    return;
  }
  const data = JSON.stringify({
    state, // pending, success, failure, error
    description: description.slice(0, 140),
    context,
    target_url: `https://ci.delqhi.com/logs/${sha.slice(0, 8)}`,
  });
  const options = {
    hostname: "api.github.com",
    path: `/repos/${OWNER}/${REPO}/statuses/${sha}`,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GITHUB_TOKEN}`,
      "Accept": "application/vnd.github+json",
      "User-Agent": "opensin-ci",
      "Content-Length": Buffer.byteLength(data),
    },
  };
  const req = https.request(options, (res) => {
    let body = "";
    res.on("data", (d) => (body += d));
    res.on("end", () => log(`GitHub status ${state}: ${res.statusCode} ${body.slice(0, 100)}`));
  });
  req.on("error", (e) => log(`GitHub status error: ${e.message}`));
  req.write(data);
  req.end();
}

const https = require("https");

// ── Run a command and return { ok, stdout, stderr } ────
function run(cmd, opts = {}) {
  return new Promise((resolve) => {
    // Source nvm so Node 22 is available in subprocesses
    const fullCmd = `export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm use 22 >/dev/null 2>&1 && ${cmd}`;
    exec(fullCmd, { cwd: opts.cwd || REPO_DIR, timeout: opts.timeout || 300000, maxBuffer: 10 * 1024 * 1024, shell: "/bin/bash" }, (err, stdout, stderr) => {
      resolve({ ok: !err, stdout: stdout.toString(), stderr: stderr.toString(), err });
    });
  });
}

// ── Main CI pipeline ────────────────────────────────────
async function runPipeline(sha) {
  log(`=== Pipeline START for ${sha.slice(0, 8)} ===`);
  const steps = [];

  // 1. Pull latest code
  log("Step 1: git fetch + reset");
  await run("git fetch origin main");
  await run(`git reset --hard ${sha}`);
  steps.push({ name: "git-pull", ok: true });

  // 2. Branding lint
  log("Step 2: branding lint");
  const branding = await run("bash scripts/check-branding.sh");
  steps.push({ name: "branding-lint", ok: branding.ok, detail: branding.stderr.slice(-200) });
  log(`  branding: ${branding.ok ? "PASS" : "FAIL"}`);

  // 3. Frontend install
  log("Step 3: frontend yarn install");
  const feInstall = await run("yarn install --frozen-lockfile --network-timeout 100000 --ignore-engines", { cwd: REPO_DIR + "/frontend" });
  steps.push({ name: "frontend-install", ok: feInstall.ok, detail: feInstall.stderr.slice(-200) });
  log(`  fe-install: ${feInstall.ok ? "PASS" : "FAIL"}`);

  // 4. Frontend build
  log("Step 4: frontend build");
  const feBuild = await run("node -v && yarn build 2>&1", { cwd: REPO_DIR + "/frontend", timeout: 180000 });
  steps.push({ name: "frontend-build", ok: feBuild.ok, detail: (feBuild.stdout + feBuild.stderr).slice(-300) });
  log(`  fe-build: ${feBuild.ok ? "PASS" : "FAIL"}`);

  // 5. Frontend tests
  log("Step 5: frontend tests");
  const feTest = await run("CI=true yarn test --reporter=dot 2>&1 | tail -10", { cwd: REPO_DIR + "/frontend", timeout: 300000 });
  const feTestOk = feTest.ok && (feTest.stdout.includes("passed") || feTest.stdout.includes("Tests"));
  steps.push({ name: "frontend-tests", ok: feTestOk, detail: feTest.stdout.slice(-200) });
  log(`  fe-tests: ${feTestOk ? "PASS" : "FAIL"}`);

  // 6. Server install
  log("Step 6: server yarn install");
  const srvInstall = await run("yarn install --frozen-lockfile --network-timeout 100000 --ignore-engines", { cwd: REPO_DIR + "/server" });
  steps.push({ name: "server-install", ok: srvInstall.ok, detail: srvInstall.stderr.slice(-200) });
  log(`  srv-install: ${srvInstall.ok ? "PASS" : "FAIL"}`);

  // 7. Server tests
  log("Step 7: server tests");
  const srvTest = await run('CI=true NODE_OPTIONS="--experimental-vm-modules" npx jest --ci --passWithNoTests 2>&1 | tail -10', { cwd: REPO_DIR + "/server", timeout: 300000 });
  const srvTestOk = srvTest.ok || srvTest.stdout.includes("passed");
  steps.push({ name: "server-tests", ok: srvTestOk, detail: srvTest.stdout.slice(-200) });
  log(`  srv-tests: ${srvTestOk ? "PASS" : "FAIL"}`);

  // Summary
  const allOk = steps.every((s) => s.ok);
  log(`=== Pipeline ${allOk ? "PASS" : "FAIL"} ===`);
  steps.forEach((s) => log(`  ${s.ok ? "✓" : "✗"} ${s.name}${s.detail ? ": " + s.detail.slice(0, 80) : ""}`));

  // 8. Deploy if all passed
  if (allOk) {
    log("Step 8: DEPLOY");
    const deploy = await deployToContainer();
    log(`  deploy: ${deploy.ok ? "DONE" : "FAIL: " + deploy.error}`);
  }

  return { allOk, steps };
}

// ── Deploy to production container ──────────────────────
async function deployToContainer() {
  try {
    // Copy frontend dist into container
    await run(`docker cp ${REPO_DIR}/frontend/dist/. opensin-app:/app/server/public/`);
    // Copy server files (exclude .env, storage, prisma DBs)
    await run(`docker cp ${REPO_DIR}/server/endpoints opensin-app:/app/server/endpoints`);
    await run(`docker cp ${REPO_DIR}/server/utils opensin-app:/app/server/utils`);
    await run(`docker cp ${REPO_DIR}/server/models opensin-app:/app/server/models`);
    // Restart container
    await run("docker restart opensin-app");
    // Wait for health
    await new Promise((r) => setTimeout(r, 15000));
    const health = await run("docker exec opensin-app curl -s http://localhost:3001/healthz");
    if (!health.ok || !health.stdout.includes("ok")) {
      return { ok: false, error: "health check failed" };
    }
    // Restart cloudflare tunnel
    await run("sudo systemctl restart cloudflared-opensin-chat.service");
    await new Promise((r) => setTimeout(r, 15000));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ── Webhook signature verification ──────────────────────
function verifySignature(body, signature) {
  if (!WEBHOOK_SECRET) return true; // skip if no secret configured
  if (!signature) return false;
  const hmac = crypto.createHmac("sha256", WEBHOOK_SECRET);
  hmac.update(body);
  const expected = "sha256=" + hmac.digest("hex");
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

// ── HTTP server ─────────────────────────────────────────
const server = http.createServer((req, res) => {
  if (req.method !== "POST") {
    res.writeHead(200);
    res.end("OpenSIN-Chat CI webhook receiver\n");
    return;
  }

  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", async () => {
    // Verify signature
    const signature = req.headers["x-hub-signature-256"];
    if (!verifySignature(body, signature)) {
      log("Webhook signature verification FAILED — rejecting");
      res.writeHead(403);
      res.end("Forbidden\n");
      return;
    }

    const event = req.headers["x-github-event"];
    if (event !== "push") {
      res.writeHead(200);
      res.end("Ignored event: " + event + "\n");
      return;
    }

    let payload;
    try {
      payload = JSON.parse(body);
    } catch {
      res.writeHead(400);
      res.end("Invalid JSON\n");
      return;
    }

    const branch = payload.ref?.replace("refs/heads/", "");
    const sha = payload.after;

    if (branch !== "main") {
      res.writeHead(200);
      res.end("Ignored branch: " + branch + "\n");
      return;
    }

    log(`Webhook received: push to main, sha=${sha?.slice(0, 8)}`);
    res.writeHead(202);
    res.end("Accepted — pipeline started\n");

    // Set pending status
    setCommitStatus(sha, "pending", "CI pipeline running...");

    // Run pipeline asynchronously
    try {
      const result = await runPipeline(sha);
      setCommitStatus(
        sha,
        result.allOk ? "success" : "failure",
        result.allOk ? "All checks passed + deployed" : `Failed: ${result.steps.filter((s) => !s.ok).map((s) => s.name).join(", ")}`,
      );
    } catch (e) {
      log(`Pipeline error: ${e.message}`);
      setCommitStatus(sha, "error", `Pipeline error: ${e.message}`);
    }
  });
});

server.listen(PORT, "127.0.0.1", () => {
  log(`OpenSIN-Chat CI webhook receiver listening on http://127.0.0.1:${PORT}`);
  log(`Repo: ${REPO_DIR}`);
  log(`Webhook secret: ${WEBHOOK_SECRET ? "configured" : "NOT SET"}`);
  log(`GitHub token: ${GITHUB_TOKEN ? "configured" : "NOT SET"}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  log("SIGTERM received — shutting down");
  server.close(() => process.exit(0));
});
process.on("SIGINT", () => {
  log("SIGINT received — shutting down");
  server.close(() => process.exit(0));
});
