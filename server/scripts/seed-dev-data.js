// SPDX-License-Identifier: MIT
// Purpose: Seed script for development — creates mock triggers, agent runs,
//          and fake connector accounts for local testing.
// Usage: node server/scripts/seed-dev-data.js
// Docs: seed-dev-data.doc.md

const prisma = require("../utils/prisma").default || require("../utils/prisma");
const { EncryptionManager } = require("../utils/EncryptionManager");
const { v4: uuidv4 } = require("uuid");
const consoleLogger = require("../utils/logger/console.js");

const enc = new EncryptionManager();

async function seedDevData() {
  consoleLogger.log("=== Seeding dev data ===");

  // 1. Find or create a default workspace
  let workspace = await prisma.workspaces.findFirst();
  if (!workspace) {
    consoleLogger.log("No workspace found — creating 'Dev Workspace'");
    workspace = await prisma.workspaces.create({
      data: {
        name: "Dev Workspace",
        slug: "dev",
        llm_provider: "openai",
        llm_model: "gpt-4o",
      },
    });
  }
  consoleLogger.log(`Workspace: ${workspace.name} (id=${workspace.id})`);

  // 2. Seed agent_runs (mix of statuses)
  const mockRuns = [
    { agentName: "Main Agent", model: "gpt-4o", status: "done", parentRunId: null, ageMin: 30 },
    { agentName: "Research Agent", model: "gpt-4o", status: "done", parentRunId: null, ageMin: 60 },
    { agentName: "Summary Agent", model: "gpt-4o-mini", status: "error", parentRunId: null, ageMin: 120 },
    { agentName: "Active Agent", model: "gpt-4o", status: "running", parentRunId: null, ageMin: 2 },
    { agentName: "Sub-Research", model: "gpt-4o-mini", status: "done", parentRunId: null, ageMin: 55 },
  ];

  // First create parent runs, then link children
  const createdRuns = {};
  for (const mock of mockRuns) {
    const runId = uuidv4();
    const startedAt = new Date(Date.now() - mock.ageMin * 60_000);
    const endedAt = mock.status === "running" ? null : new Date(startedAt.getTime() + 5 * 60_000);

    // Resolve parent
    let parentRunId = null;
    if (mock.agentName === "Sub-Research") {
      parentRunId = createdRuns["Research Agent"] || null;
    }

    await prisma.agent_runs.create({
      data: {
        id: runId,
        workspace_id: workspace.id,
        parent_run_id: parentRunId,
        agent_name: mock.agentName,
        model: mock.model,
        status: mock.status,
        started_at: startedAt,
        ended_at: endedAt,
      },
    });
    createdRuns[mock.agentName] = runId;
    consoleLogger.log(`  Run: ${mock.agentName} (${mock.status}) → ${runId.slice(0, 8)}`);
  }

  // 3. Seed connector_accounts (fake, encrypted with dummy tokens)
  const mockConnectors = [
    { provider: "google", providerAccount: "dev-user@gmail.com", scopes: "openid email profile https://www.googleapis.com/auth/gmail.modify" },
    { provider: "github", providerAccount: "dev-user", scopes: "read:user repo" },
  ];

  for (const conn of mockConnectors) {
    const existing = await prisma.connector_accounts.findFirst({
      where: { provider: conn.provider, provider_account: conn.providerAccount },
    });
    if (existing) {
      consoleLogger.log(`  Connector: ${conn.provider}/${conn.providerAccount} (already exists)`);
      continue;
    }

    await prisma.connector_accounts.create({
      data: {
        provider: conn.provider,
        provider_account: conn.providerAccount,
        scopes: conn.scopes,
        access_token_enc: enc.encrypt("dev-mock-access-token-" + Date.now()),
        refresh_token_enc: enc.encrypt("dev-mock-refresh-token-" + Date.now()),
        token_type: "Bearer",
        expires_at: new Date(Date.now() + 3600_000),
        status: "active",
        user_id: null,
      },
    });
    consoleLogger.log(`  Connector: ${conn.provider}/${conn.providerAccount} (created)`);
  }

  // 4. Seed agent_triggers
  const mockTriggers = [
    {
      name: "Tägliche Zusammenfassung",
      agentName: "@agent",
      type: "schedule",
      config: { cron_expression: "0 9 * * 1-5", prompt: "Fasse die wichtigsten Nachrichten des Tages zusammen." },
      active: true,
    },
    {
      name: "GitHub Issues Check",
      agentName: "@agent",
      type: "polling",
      config: { poll_interval_ms: 300000, connector: "github", product: "repo", prompt: "Prüfe auf neue GitHub-Issues." },
      active: true,
    },
    {
      name: "Deaktivierter Trigger",
      agentName: "@agent",
      type: "schedule",
      config: { cron_expression: "0 0 * * 0", prompt: "Wöchentlicher Bericht." },
      active: false,
    },
  ];

  for (const trig of mockTriggers) {
    const existing = await prisma.agent_triggers.findFirst({
      where: { workspace_id: workspace.id, name: trig.name },
    });
    if (existing) {
      consoleLogger.log(`  Trigger: ${trig.name} (already exists)`);
      continue;
    }

    const nextRunAt = trig.active
      ? new Date(Date.now() + 120_000) // 2 min from now
      : null;

    await prisma.agent_triggers.create({
      data: {
        id: uuidv4(),
        workspace_id: workspace.id,
        agent_name: trig.agentName,
        name: trig.name,
        type: trig.type,
        config: JSON.stringify(trig.config),
        active: trig.active,
        next_run_at: nextRunAt,
      },
    });
    consoleLogger.log(`  Trigger: ${trig.name} (${trig.type}, active=${trig.active})`);
  }

  // 5. Seed trigger_runs (history)
  const firstTrigger = await prisma.agent_triggers.findFirst({
    where: { workspace_id: workspace.id, name: "Tägliche Zusammenfassung" },
  });
  if (firstTrigger) {
    const runStatuses = ["done", "done", "done", "error", "done"];
    for (let i = 0; i < runStatuses.length; i++) {
      const status = runStatuses[i];
      const startedAt = new Date(Date.now() - (i + 1) * 86400_000); // i+1 days ago
      await prisma.trigger_runs.create({
        data: {
          id: uuidv4(),
          trigger_id: firstTrigger.id,
          status,
          attempt: status === "error" ? 3 : 1,
          error_message: status === "error" ? "Agent timeout after 60s" : null,
          result: status === "done" ? JSON.stringify({ response: "Zusammenfassung erfolgreich." }) : null,
          started_at: startedAt,
          ended_at: new Date(startedAt.getTime() + 30_000),
        },
      });
    }
    consoleLogger.log(`  Trigger runs: 5 runs seeded for "Tägliche Zusammenfassung"`);
  }

  consoleLogger.log("=== Seed complete ===");
  consoleLogger.log("Run `yarn dev:server` and check:");
  consoleLogger.log("  - Agent Sessions panel → shows mock runs");
  consoleLogger.log("  - GET /api/connectors → shows mock connector accounts");
  consoleLogger.log("  - Agent Settings → TriggerManager shows mock triggers");
}

seedDevData()
  .catch((e) => {
    consoleLogger.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
