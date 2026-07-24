// SPDX-License-Identifier: MIT
const {
  sanitizeTitle,
  sanitizeBody,
  sanitizeLabels,
  resolveFeedbackRepo,
} = require("../../../endpoints/system/feedback");

describe("feedback helpers", () => {
  const prevRepo = process.env.GITHUB_FEEDBACK_REPO;

  afterEach(() => {
    if (prevRepo === undefined) delete process.env.GITHUB_FEEDBACK_REPO;
    else process.env.GITHUB_FEEDBACK_REPO = prevRepo;
  });

  test("sanitizeTitle trims and collapses whitespace", () => {
    expect(sanitizeTitle("  hello\nworld\t ")).toBe("hello world");
  });

  test("sanitizeTitle enforces min-usable length for empty", () => {
    expect(sanitizeTitle("")).toBe("");
    expect(sanitizeTitle("ab").length).toBe(2);
  });

  test("sanitizeBody truncates long content", () => {
    const long = "x".repeat(20_000);
    expect(sanitizeBody(long).length).toBe(12_000);
  });

  test("sanitizeLabels defaults to feedback and filters unknown", () => {
    expect(sanitizeLabels(undefined)).toEqual(["feedback"]);
    expect(sanitizeLabels(["bug", "not-a-label", "BUG"])).toEqual(["bug"]);
  });

  test("resolveFeedbackRepo uses env when valid", () => {
    process.env.GITHUB_FEEDBACK_REPO = "Family-Team-Projects/OpenAfD-Chat";
    expect(resolveFeedbackRepo()).toBe("Family-Team-Projects/OpenAfD-Chat");
  });

  test("resolveFeedbackRepo falls back for invalid env", () => {
    process.env.GITHUB_FEEDBACK_REPO = "not valid";
    expect(resolveFeedbackRepo()).toBe("OpenSIN-AI/OpenSIN-Chat");
  });
});
