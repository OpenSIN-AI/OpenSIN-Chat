// SPDX-License-Identifier: MIT
// Docs: utils.doc.md
import strDistance from "js-levenshtein";

const LEVENSHTEIN_THRESHOLD = 3;

type Skill = {
  title: string;
  description: string;
};

type SkillCategory = {
  title: string;
  icon: any;
  skills: Skill[];
  [key: string]: any;
};

function skillMatchesSearch(skill: Skill, searchTerm: string): boolean {
  if (!searchTerm) return true;

  const normalizedSearch = searchTerm.toLowerCase().trim();
  const titleLower = skill.title.toLowerCase();
  const descLower = skill.description.toLowerCase();

  if (titleLower.includes(normalizedSearch)) return true;
  if (descLower.includes(normalizedSearch)) return true;
  if (strDistance(titleLower, normalizedSearch) <= LEVENSHTEIN_THRESHOLD)
    return true;

  return false;
}

export function filterSkillCategories(
  skillCategories: Record<string, SkillCategory>,
  searchTerm: string,
): Record<string, SkillCategory> {
  if (!searchTerm) return skillCategories;

  const filtered: Record<string, SkillCategory> = {};
  for (const [key, category] of Object.entries(skillCategories)) {
    const matchingSkills = category.skills.filter((skill) =>
      skillMatchesSearch(skill, searchTerm),
    );
    if (matchingSkills.length > 0) {
      filtered[key] = { ...category, skills: matchingSkills };
    }
  }
  return filtered;
}
