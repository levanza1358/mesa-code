// ============================================================
// Skills Section Builder
// ============================================================

import type { SkillLoadOutcome, SkillMetadata } from "@mesa-code/contracts";
import type { ContextSection } from "../types.js";
import { estimateTokens } from "../utils.js";

const DEFAULT_SKILL_METADATA_BUDGET = 20_000;
const MAX_DESCRIPTION_CHARS = 250;

interface SkillsSectionOptions {
  outcome: SkillLoadOutcome;
  metadataBudget?: number;
}

export function buildSkillsSection(options: SkillsSectionOptions): ContextSection | null {
  if (options.outcome.skills.length === 0) {
    return null;
  }

  const content = buildSkillsContent(
    options.outcome.skills,
    options.metadataBudget ?? DEFAULT_SKILL_METADATA_BUDGET,
  );

  return {
    name: "Skills",
    source: "skills",
    injectionTarget: "meta_user",
    cacheHint: "dynamic",
    chars: content.length,
    tokens: estimateTokens(content),
    content,
    preview: content.slice(0, 100),
  };
}

function buildSkillsContent(skills: SkillMetadata[], budget: number): string {
  const lines = [
    "The following skills are available to you. This is a standing requirement, not a suggestion:",
    "",
    "- Before starting a non-trivial task, decide whether any skill below matches it. Do this as a deliberate step, not in passing.",
    "- When one matches, you MUST call the Skill tool with that exact name before doing the work. Do not merely announce that you will use or read it. After loading it, apply its instructions and continue the original task in the same run.",
    "- A listed skill you judged relevant and skipped is a defect. Only skip when nothing matches, the task is trivial, or the skill is already loaded this turn.",
    "",
    "Available skills (call the Skill tool by name to load one):",
    "",
  ];

  const sortedSkills = [...skills].sort((a, b) =>
    skillDisplayName(a).localeCompare(skillDisplayName(b)),
  );
  const skillLines = sortedSkills.map((skill) => formatSkillLine(skill, MAX_DESCRIPTION_CHARS));
  const full = [...lines, ...skillLines].join("\n");
  if (full.length <= budget) {
    return full;
  }

  const namesOnly = sortedSkills.map(
    (skill) => `- ${skillDisplayName(skill)}${bareAliasSuffix(skill)} (file: ${skill.path})`,
  );
  return [...lines, ...namesOnly].join("\n");
}

function formatSkillLine(skill: SkillMetadata, maxDescriptionChars: number): string {
  const description = skill.whenToUse
    ? `${skill.description} - ${skill.whenToUse}`
    : skill.description;
  const trimmed =
    description.length > maxDescriptionChars
      ? `${description.slice(0, maxDescriptionChars - 1)}...`
      : description;
  return `- ${skillDisplayName(skill)}: ${trimmed}${bareAliasSuffix(skill)} (file: ${skill.path})`;
}

function skillDisplayName(skill: SkillMetadata): string {
  return skill.qualifiedName ?? skill.name;
}

function bareAliasSuffix(skill: SkillMetadata): string {
  return skill.qualifiedName && skill.qualifiedName !== skill.name
    ? ` (also loadable as ${skill.name})`
    : "";
}
