// SPDX-License-Identifier: MIT
// Regression test for the bug:
//   User asks "hast du web zugriff?" without the @agent prefix.
//   The LLM must NOT claim it has no web access at all — it must tell the
//   user that tools are available via the @agent prefix.

describe("SystemSettings.saneDefaultSystemPrompt", () => {
  const { SystemSettings } = require("../../models/systemSettings");

  test("is a non-empty string", () => {
    expect(typeof SystemSettings.saneDefaultSystemPrompt).toBe("string");
    expect(SystemSettings.saneDefaultSystemPrompt.length).toBeGreaterThan(50);
  });

  test("mentions that the LLM has no web/tools access in the normal chat mode", () => {
    const prompt = SystemSettings.saneDefaultSystemPrompt.toLowerCase();
    expect(prompt).toMatch(/keine.*werkzeuge|kein.*webzugriff|kein.*internet/);
  });

  test("mentions the @agent prefix as the way to enable tools", () => {
    expect(SystemSettings.saneDefaultSystemPrompt).toMatch(/@agent/);
  });

  test("mentions 'web' or 'werkzeug' or 'tool' so the LLM knows about tools", () => {
    const prompt = SystemSettings.saneDefaultSystemPrompt.toLowerCase();
    expect(prompt).toMatch(/web|werkzeug|tool/);
  });

  test("remains in German (project requirement)", () => {
    const prompt = SystemSettings.saneDefaultSystemPrompt;
    expect(prompt).toMatch(/Antworte|Webzugriff|Werkzeug|Nutzer/);
  });
});
