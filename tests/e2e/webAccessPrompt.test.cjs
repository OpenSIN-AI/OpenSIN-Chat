// SPDX-License-Identifier: MIT
// End-to-end test for the bug:
//   User asks "hast du web zugriff?" without @agent prefix -> LLM says "no".
//
// The LLM must instead acknowledge that tools are available via the @agent
// prefix (workspace prompt teaches it so), and the @agent flow itself must
// remain functional.
//
// Run inside the OpenAfD container (where the running server + Prisma live):
//   docker cp tests/e2e/webAccessPrompt.test.cjs openafd:/tmp/test.cjs
//   docker exec openafd sh -c 'cd /app/server && node /tmp/test.cjs'

const http = require("http");
const { PrismaClient } = require("/app/server/node_modules/@prisma/client");

const API_KEY = "pol-test-key-001";
const WORKSPACE_SLUG = "test";
const BASE = "http://localhost:3001/api";

function postJSON(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(
      BASE + path,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + API_KEY,
          Accept: "text/event-stream",
        },
      },
      (res) => {
        let buf = "";
        res.on("data", (chunk) => (buf += chunk));
        res.on("end", () => resolve({ status: res.statusCode, body: buf }));
      }
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

function parseSSE(body) {
  const events = [];
  for (const line of body.split("\n")) {
    if (!line.startsWith("data: ")) continue;
    try {
      events.push(JSON.parse(line.slice(6)));
    } catch {}
  }
  return events;
}

(async () => {
  console.log("=== E2E Test: LLM awareness of @agent tooling ===\n");

  // 1. Prompt in DB
  const prisma = new PrismaClient();
  const ws = await prisma.workspaces.findUnique({ where: { slug: WORKSPACE_SLUG } });
  await prisma.$disconnect();
  if (!ws) {
    console.error("FAIL: workspace 'test' not found");
    process.exit(1);
  }
  const prompt = ws.openAiPrompt || "";
  console.log("[1] Workspace prompt length: " + prompt.length);
  console.log("[1] Contains @agent: " + prompt.includes("@agent"));
  console.log("[1] Contains Werkzeug: " + prompt.includes("Werkzeug"));
  if (!prompt.includes("@agent") || !prompt.includes("Werkzeug")) {
    console.error("FAIL: prompt not updated");
    process.exit(1);
  }
  console.log("PASS: system prompt has the new rule 7\n");

  // 2. Send the bug-trigger chat
  console.log("[2] POST /workspace/" + WORKSPACE_SLUG + "/stream-chat 'hast du web zugriff?'");
  const t0 = Date.now();
  const { status, body } = await postJSON(
    "/workspace/" + WORKSPACE_SLUG + "/stream-chat",
    { message: "hast du web zugriff?" }
  );
  console.log("[2] HTTP " + status + " in " + (Date.now() - t0) + "ms, body size=" + body.length);

  if (status !== 200) {
    console.error("FAIL: expected 200, got " + status);
    console.error(body.slice(0, 500));
    process.exit(1);
  }

  const events = parseSSE(body);
  const aborted = events.find((e) => e.type === "abort");
  if (aborted) {
    console.error("FAIL: stream aborted:", aborted.error || aborted.textResponse);
    process.exit(1);
  }

  // Concatenate all textResponse payloads, strip <think>...</think> blocks
  // (Nemotron reasoning model emits chain-of-thought).
  const textChunks = events
    .map((e) => e.textResponse || "")
    .filter((t) => typeof t === "string" && t.length > 0);
  const fullText = textChunks.join("")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .trim();

  console.log("[3] Response text (" + fullText.length + " chars):");
  console.log("---");
  console.log(fullText);
  console.log("---");

  if (!fullText) {
    console.error("FAIL: empty response");
    process.exit(1);
  }

  const lower = fullText.toLowerCase();
  if (!(lower.includes("@agent") || lower.includes("agent") || lower.includes("präfix"))) {
    console.error("FAIL: response does not mention @agent or 'agent'");
    process.exit(1);
  }
  console.log("PASS: response acknowledges @agent tooling\n");

  // 3. Backward compat: @agent prefix must still work
  console.log("[4] Backward-compat: POST '@agent Suche im Web nach Wetter Berlin'");
  const { status: s2, body: b2 } = await postJSON(
    "/workspace/" + WORKSPACE_SLUG + "/stream-chat",
    { message: "@agent Suche im Web nach Wetter Berlin" }
  );
  const ev2 = parseSSE(b2);
  const initEv = ev2.find((e) => e.type === "agentInitWebsocketConnection");
  const statusEv = ev2.find(
    (e) => e.type === "statusResponse" && e.textResponse && e.textResponse.includes("@agent")
  );
  console.log("[4] HTTP " + s2 + " agentInit=" + !!initEv + " status=" + !!statusEv);
  if (s2 !== 200 || !initEv || !statusEv) {
    console.error("FAIL: @agent flow broken");
    process.exit(1);
  }
  console.log("PASS: @agent flow still works (backward compat)\n");

  console.log("=== ALL CHECKS PASSED ===");
  console.log("- prompt length:   " + prompt.length);
  console.log("- response length: " + fullText.length);
  console.log("- mentions @agent: yes");
  process.exit(0);
})().catch((err) => {
  console.error("ERROR:", err);
  process.exit(1);
});
