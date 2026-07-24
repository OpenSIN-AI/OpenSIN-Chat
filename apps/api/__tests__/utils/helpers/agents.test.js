// SPDX-License-Identifier: MIT
const { skillIsAutoApproved } = require("../../../utils/helpers/agents");

describe("skillIsAutoApproved", () => {
  const originalEnv = process.env.AGENT_AUTO_APPROVED_SKILLS;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.AGENT_AUTO_APPROVED_SKILLS;
    } else {
      process.env.AGENT_AUTO_APPROVED_SKILLS = originalEnv;
    }
  });

  test("returns false when ENV is not set", () => {
    delete process.env.AGENT_AUTO_APPROVED_SKILLS;
    expect(skillIsAutoApproved({ skillName: "my-skill" })).toBe(false);
  });

  test("returns false for empty ENV value", () => {
    process.env.AGENT_AUTO_APPROVED_SKILLS = "";
    expect(skillIsAutoApproved({ skillName: "my-skill" })).toBe(false);
  });

  test("returns true when skill is in list", () => {
    process.env.AGENT_AUTO_APPROVED_SKILLS = "skill1,skill2,my-skill";
    expect(skillIsAutoApproved({ skillName: "my-skill" })).toBe(true);
  });

  test("returns false when skill is not in list", () => {
    process.env.AGENT_AUTO_APPROVED_SKILLS = "skill1,skill2";
    expect(skillIsAutoApproved({ skillName: "my-skill" })).toBe(false);
  });

  test("returns true when <all> is in list", () => {
    process.env.AGENT_AUTO_APPROVED_SKILLS = "skill1,<all>";
    expect(skillIsAutoApproved({ skillName: "any-skill" })).toBe(true);
  });

  test("trims whitespace in skill list", () => {
    process.env.AGENT_AUTO_APPROVED_SKILLS = " skill1 , my-skill ";
    expect(skillIsAutoApproved({ skillName: "my-skill" })).toBe(true);
  });

  test("filters out empty entries", () => {
    process.env.AGENT_AUTO_APPROVED_SKILLS = "skill1,,,my-skill,";
    expect(skillIsAutoApproved({ skillName: "my-skill" })).toBe(true);
  });

  test("handles single skill", () => {
    process.env.AGENT_AUTO_APPROVED_SKILLS = "my-skill";
    expect(skillIsAutoApproved({ skillName: "my-skill" })).toBe(true);
  });
});
