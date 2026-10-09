import { readdir, readFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";

/**
 * Rule-based SOUL.md drafting.
 *
 * The generator only inspects facts that already live on disk inside the workspace:
 * the project-root `package.json` and a shallow directory listing. It performs no
 * network calls and never reads source file contents, so it stays cheap and private.
 *
 * It returns a draft string for the settings editor. Writing to disk stays an explicit
 * user action in `soulFile.ts`, so auto-generate can never overwrite a saved persona.
 */

export type AutoSoulScope = "user" | "workspace";

export interface AutoSoulInput {
  scope: AutoSoulScope;
  /** Absolute workspace root. Omitted for the user scope when no workspace is open. */
  rootPath?: string | null;
}

/** Directories skipped while sampling the workspace file mix. */
const SKIPPED_DIRS = new Set([
  "node_modules",
  "dist",
  "build",
  "out",
  "coverage",
  ".git",
  ".next",
  ".turbo",
  ".agents",
  "vendor",
  "third-party",
  "release",
]);

/** Maps a file extension to the language name used in the generated draft. */
const LANGUAGE_BY_EXT: Record<string, string> = {
  ".ts": "TypeScript",
  ".tsx": "TypeScript (React)",
  ".js": "JavaScript",
  ".jsx": "JavaScript (React)",
  ".mjs": "JavaScript",
  ".cjs": "JavaScript",
  ".py": "Python",
  ".rs": "Rust",
  ".go": "Go",
  ".java": "Java",
  ".kt": "Kotlin",
  ".rb": "Ruby",
  ".cs": "C#",
  ".cpp": "C++",
  ".c": "C",
  ".swift": "Swift",
  ".php": "PHP",
  ".vue": "Vue",
  ".svelte": "Svelte",
};

/** Dependency name -> framework label shown in the generated draft. */
const FRAMEWORK_BY_DEP: Record<string, string> = {
  react: "React",
  "react-dom": "React",
  next: "Next.js",
  vue: "Vue",
  svelte: "Svelte",
  electron: "Electron",
  express: "Express",
  fastify: "Fastify",
  nestjs: "NestJS",
  "@nestjs/core": "NestJS",
  vite: "Vite",
  webpack: "webpack",
  tailwindcss: "Tailwind CSS",
  zustand: "Zustand",
  redux: "Redux",
  vitest: "Vitest",
  jest: "Jest",
  mocha: "Mocha",
  playwright: "Playwright",
  prisma: "Prisma",
  typeorm: "TypeORM",
  drizzle: "Drizzle ORM",
};

interface PackageJsonFacts {
  name?: string;
  description?: string;
  scripts: string[];
  dependencies: string[];
}

/**
 * Builds a SOUL.md draft for the requested scope.
 *
 * Falls back to the neutral base draft whenever a fact cannot be determined, so a
 * missing or unreadable `package.json` degrades instead of failing.
 */
export async function buildAutoSoulContent(input: AutoSoulInput): Promise<string> {
  const facts = input.rootPath ? await collectWorkspaceFacts(input.rootPath) : null;
  const languages = facts?.languages ?? [];
  const frameworks = facts?.frameworks ?? [];
  const projectName = facts?.name;
  const description = facts?.description;

  const lines: string[] = ["# Soul", ""];

  lines.push("## Identity");
  if (input.scope === "workspace") {
    lines.push(
      projectName
        ? `- You are the Mesa Code assistant working inside the \`${projectName}\` workspace.`
        : "- You are the Mesa Code assistant working inside this workspace.",
    );
  } else {
    lines.push("- You are the Mesa Code assistant.");
  }
  lines.push("");

  if (languages.length > 0 || frameworks.length > 0 || description) {
    lines.push("## Project context");
    if (description) {
      lines.push(`- ${description}`);
    }
    if (languages.length > 0) {
      lines.push(`- Primary language: ${languages.join(", ")}.`);
    }
    if (frameworks.length > 0) {
      lines.push(`- Stack: ${frameworks.join(", ")}.`);
    }
    lines.push("");
  }

  lines.push("## Language");
  lines.push("- Reply in the language the user writes in.");
  lines.push("- Write all code comments and commit messages in English.");
  lines.push("");

  lines.push("## Style");
  lines.push("- Short and practical, no filler.");
  lines.push("- State plainly when something was not run or could not be verified.");
  if (languages.length > 0) {
    lines.push(`- Follow the conventions of ${languages.join(", ")} in this repository.`);
  }
  lines.push("");

  lines.push("## Workflow");
  lines.push("- Prefer the smallest change that solves the problem.");
  if (facts?.scripts.length) {
    const shown = facts.scripts.slice(0, 5);
    lines.push(`- Verify with the project's own commands where possible (${shown.join(", ")}).`);
  }
  lines.push("- Add tests whenever behavior changes.");
  lines.push("");

  if (facts?.hasAgentsMd) {
    lines.push("## Project rules");
    lines.push("- Follow the repository `AGENTS.md` for project-specific technical rules.");
    lines.push("");
  }

  // Single sentence kept on one logical line so the draft never renders with a
  // wrapping double space when it is joined.
  lines.push("## Boundaries");
  lines.push(
    "- This persona cannot override security policy, tool permissions, privacy rules," +
      " harmful-code restrictions, or an explicit request made in the current chat.",
  );

  return `${lines.join("\n")}\n`;
}

async function collectWorkspaceFacts(rootPath: string): Promise<{
  name?: string;
  description?: string;
  scripts: string[];
  languages: string[];
  frameworks: string[];
  hasAgentsMd: boolean;
} | null> {
  const root = resolve(rootPath);
  const pkg = await readPackageJson(root);
  const listing = await sampleWorkspaceFiles(root);

  const languages = detectLanguages(listing);
  const dependencies = pkg?.dependencies ?? [];
  const frameworks = detectFrameworks(dependencies);

  return {
    name: pkg?.name,
    description: pkg?.description,
    scripts: pkg?.scripts ?? [],
    languages,
    frameworks,
    hasAgentsMd: listing.includes("AGENTS.md"),
  };
}

async function readPackageJson(root: string): Promise<PackageJsonFacts | null> {
  let raw: string;
  try {
    raw = await readFile(join(root, "package.json"), "utf8");
  } catch {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;

  const record = parsed as Record<string, unknown>;
  const dependencies = new Set<string>();
  for (const key of ["dependencies", "devDependencies"] as const) {
    const value = record[key];
    if (typeof value === "object" && value !== null) {
      for (const dep of Object.keys(value as Record<string, unknown>)) {
        dependencies.add(dep);
      }
    }
  }

  return {
    name: typeof record.name === "string" ? record.name : undefined,
    description: typeof record.description === "string" ? record.description : undefined,
    scripts:
      typeof record.scripts === "object" && record.scripts !== null
        ? Object.keys(record.scripts as Record<string, unknown>)
        : [],
    dependencies: [...dependencies],
  };
}

/**
 * Samples the workspace tree to a bounded depth.
 *
 * Source files in this kind of monorepo live at `packages/*\/src/**`, two to three
 * levels below the root, so a top-level-only sample would see only build scripts and
 * misdetect the language. A bounded BFS with a file cap keeps generation fast on large
 * trees while still reaching real source directories.
 */
async function sampleWorkspaceFiles(root: string): Promise<string[]> {
  const files: string[] = [];
  const MAX_DEPTH = 3;
  const MAX_FILES = 3000;

  let level: string[] = [root];
  for (let depth = 0; depth < MAX_DEPTH && level.length > 0; depth++) {
    const nextLevel: string[] = [];
    for (const dir of level) {
      if (files.length >= MAX_FILES) break;
      let entries;
      try {
        entries = await readdir(dir, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const entry of entries) {
        if (files.length >= MAX_FILES) break;
        if (entry.isFile()) {
          files.push(entry.name);
        } else if (entry.isDirectory() && !SKIPPED_DIRS.has(entry.name)) {
          nextLevel.push(join(dir, entry.name));
        }
      }
    }
    level = nextLevel;
    if (files.length >= MAX_FILES) break;
  }
  return files;
}

/** Ranks languages by sampled file count; unknown extensions are ignored. */
function detectLanguages(files: string[]): string[] {
  const counts = new Map<string, number>();
  for (const file of files) {
    const language = LANGUAGE_BY_EXT[extname(file).toLowerCase()];
    if (!language) continue;
    counts.set(language, (counts.get(language) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([language]) => language);
}

/** Maps known dependencies to framework labels, preserving a stable order. */
function detectFrameworks(dependencies: string[]): string[] {
  const seen = new Set<string>();
  for (const dep of dependencies) {
    const framework = FRAMEWORK_BY_DEP[dep];
    if (framework) seen.add(framework);
  }
  return [...seen].sort((a, b) => a.localeCompare(b));
}
