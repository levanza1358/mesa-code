// ============================================================
// Memory Section Builder
// ============================================================

import type { ContextSection } from "../types.js";
import { estimateTokens } from "../utils.js";

export function buildMemorySection(memoryRoot: string | undefined): ContextSection | null {
  if (!memoryRoot) return null;

  const content = buildMemoryContent(memoryRoot);

  return {
    name: "Memory",
    source: "memory",
    injectionTarget: "system",
    cacheHint: "dynamic",
    chars: content.length,
    tokens: estimateTokens(content),
    content,
    preview: content.slice(0, 100),
  };
}

function buildMemoryContent(memoryRoot: string): string {
  return [
    "# Memory",
    "",
    `You have a persistent file-based memory at \`${memoryRoot}/\` — it already exists, so write to it directly with the Write tool (no mkdir, no existence check). Each memory is one file holding one fact, with frontmatter:`,
    "",
    "```markdown",
    "---",
    "name: <short-kebab-case-slug>",
    "description: <one-line summary — used to decide relevance during recall>",
    "metadata:",
    "  type: user | feedback | project | reference",
    "---",
    "",
    "<the fact; for feedback/project, follow with **Why:** and **How to apply:** lines. Link related memories with [[their-name]].>",
    "```",
    "",
    "In the body, link related memories with [[name]] (the other memory's `name:` slug). Link liberally: a link to a not-yet-written memory is fine — it marks something worth writing later.",
    "",
    "`user` — who the user is (role, expertise, preferences). `feedback` — guidance on how you should work, corrections and confirmed approaches alike; include the why. `project` — ongoing work, goals, or constraints not derivable from the code or git history; use absolute dates. `reference` — pointers to external resources (URLs, dashboards, tickets).",
    "",
    "After writing the file, add a one-line pointer in `MEMORY.md` (`- [Title](file.md) — hook`). `MEMORY.md` is the index loaded into context each session: one line per memory, no frontmatter, never memory content.",
    "",
    "Before saving, check for an existing file that already covers it and update that one instead of duplicating; delete memories that turn out to be wrong. Don't save what the repo already records (code structure, past fixes, git history, AGENTS.md) or what only matters to this conversation — if asked to, ask what was non-obvious and save that.",
  ].join("\n");
}
