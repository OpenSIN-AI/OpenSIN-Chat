// SPDX-License-Identifier: MIT
const {
  parseAgentModeFromPrompt,
  buildDeepResearchHint,
  buildAgentModePrefix,
} = require("../../../utils/agents/modeHints");

describe("modeHints", () => {
  test("parses deep-research with sources tag", () => {
    const parsed = parseAgentModeFromPrompt(
      "@agent [deep-research]\n[sources:web-search,gmail]\nWhat about X?",
    );
    expect(parsed.modeId).toBe("deep-research");
    expect(parsed.sources).toEqual(["web-search", "gmail"]);
    expect(parsed.cleanMessage).toBe("What about X?");
    expect(parsed.systemPrompt).toMatch(/DEEP RESEARCH/i);
    expect(parsed.systemPrompt).toMatch(/coming soon/i);
    expect(parsed.systemPrompt).toMatch(/WEB/i);
  });

  test("defaults web-search when no sources tag", () => {
    const parsed = parseAgentModeFromPrompt("@agent [deep-research] Hello");
    expect(parsed.modeId).toBe("deep-research");
    expect(parsed.sources).toEqual([]);
    expect(parsed.cleanMessage).toBe("Hello");
    expect(buildDeepResearchHint([])).toMatch(/WEB/i);
  });

  test("buildAgentModePrefix includes sources", () => {
    expect(buildAgentModePrefix("deep-research", ["web-search"])).toBe(
      "@agent [deep-research]\n[sources:web-search]",
    );
    expect(buildAgentModePrefix("report")).toBe("@agent [report]");
  });
});
