import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

/**
 * SOUL.md persistence, mirroring the AGENTS.md convention.
 *
 * The persona layer lives in two scopes and both are plain files on disk, so there is
 * no separate store and the CLI context adapter stays the only reader:
 *   - user scope:      `~/.mesaCode/SOUL.md`
 *   - workspace scope: `<root>/SOUL.md`
 *
 * The settings UI edits these files; the runtime picks the change up on the next
 * context resolution.
 */

export const SOUL_FILE_NAME = "SOUL.md";

export type SoulFileSource = "file" | "template";

export interface SoulFileContent {
  content: string;
  /** file: the file already exists; template: it does not exist yet and content is a preview. */
  source: SoulFileSource;
}

export function resolveUserSoulFilePath(homeDir: string): string {
  return join(homeDir, ".mesaCode", SOUL_FILE_NAME);
}

export function resolveWorkspaceSoulFilePath(rootPath: string): string {
  return resolve(rootPath, SOUL_FILE_NAME);
}

/** Initial content offered to the user when no SOUL.md exists yet; saved only on explicit save. */
export function buildSoulTemplate(): string {
  return [
    "# Soul",
    "",
    "## Identity",
    "- You are the Mesa Code assistant.",
    "",
    "## Language",
    "- Reply in the language the user writes in.",
    "",
    "## Style",
    "- Short and practical, no filler.",
    "- State plainly when something was not run or could not be verified.",
    "",
    "## Workflow",
    "- Prefer the smallest change that solves the problem.",
    "",
  ].join("\n");
}

export async function readSoulFile(params: {
  homeDir: string;
  rootPath?: string | null;
  scope: "user" | "workspace";
}): Promise<SoulFileContent> {
  const filePath = resolveSoulPath(params);
  const existing = await readOptionalSoulFile(filePath);
  if (existing !== null) {
    return { content: existing, source: "file" };
  }
  return { content: buildSoulTemplate(), source: "template" };
}

export async function writeSoulFile(params: {
  homeDir: string;
  rootPath?: string | null;
  scope: "user" | "workspace";
  content: string;
}): Promise<void> {
  const filePath = resolveSoulPath(params);
  await atomicWriteSoulFile(filePath, params.content);
}

function resolveSoulPath(params: {
  homeDir: string;
  rootPath?: string | null;
  scope: "user" | "workspace";
}): string {
  if (params.scope === "user") {
    return resolveUserSoulFilePath(params.homeDir);
  }
  if (!params.rootPath) {
    throw new Error("Workspace SOUL.md requires a workspace root path");
  }
  return resolveWorkspaceSoulFilePath(params.rootPath);
}

async function readOptionalSoulFile(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

/** Write via temp file + rename so a crash cannot leave a half-written persona file. */
async function atomicWriteSoulFile(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const tempPath = `${path}.tmp-${process.pid}-${Date.now()}`;
  await writeFile(tempPath, content, "utf8");
  try {
    await rename(tempPath, path);
  } catch (error) {
    await Promise.allSettled([unlinkSafe(tempPath)]);
    throw error;
  }
}

async function unlinkSafe(path: string): Promise<void> {
  try {
    await unlink(path);
  } catch {
    // Best-effort cleanup: the caller cares about the rename failure, not this.
  }
}

function isNotFound(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === "ENOENT";
}
