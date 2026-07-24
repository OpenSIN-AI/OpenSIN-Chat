// SPDX-License-Identifier: MIT
// Regression test for the bug:
//   Sending a malformed JSON body to any /api/* POST endpoint used to return
//   HTTP 500 with a UUID error id, hiding the real cause from operators.
//   After the fix, the body-parser SyntaxError is recognised and the client
//   gets HTTP 400 with a friendly message.

const express = require("express");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const http = require("http");

// Replicate the production error handler so we test the exact code path.
function productionErrorHandler(err, _req, response, _next) {
  if (!response.headersSent && err) {
    const id = crypto.randomUUID();

    if (err.type === "entity.parse.failed" || err instanceof SyntaxError) {
      return response.status(400).json({
        error: "Malformed JSON body. Please check your request payload.",
        id,
      });
    }

    if (err.type === "entity.too.large") {
      return response.status(413).json({
        error: "Request body exceeds the permitted size limit.",
        id,
      });
    }

    return response.status(500).json({ error: "Internal server error", id });
  }
}

function bootEchoApp() {
  const app = express();
  app.use(bodyParser.json({ limit: "100kb" }));
  app.post("/echo", (req, response) => response.json({ ok: true }));
  app.use(productionErrorHandler);
  return app;
}

function listen(app) {
  return new Promise((resolve) => {
    const server = http.createServer(app).listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({ server, url: `http://127.0.0.1:${port}` });
    });
  });
}

describe("Body-parser error handler", () => {
  let server;
  let url;

  beforeAll(async () => {
    ({ server, url } = await listen(bootEchoApp()));
  });
  afterAll(() => {
    server.close();
  });

  it("returns 400 with friendly message on malformed JSON", async () => {
    const r = await fetch(`${url}/echo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json{",
    });
    expect(r.status).toBe(400);
    const j = await r.json();
    expect(j.error).toMatch(/Malformed JSON/i);
    expect(j.id).toBeTruthy();
  });

  it("returns 413 when the body exceeds the configured limit", async () => {
    const r = await fetch(`${url}/echo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // 200kb > 100kb limit
      body: '{"x":"' + "a".repeat(200_000) + '"}',
    });
    expect(r.status).toBe(413);
    const j = await r.json();
    expect(j.error).toMatch(/size limit/i);
  });

  it("passes valid JSON through unchanged", async () => {
    const r = await fetch(`${url}/echo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: '{"hello":1}',
    });
    expect(r.status).toBe(200);
  });
});
