import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { readSoulFile, writeSoulFile } from "../src/file/soulFile.js";
import { buildAutoSoulContent } from "../src/file/autoSoul.js";

async function withTempDir(run: (dir: string) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), "mesa-code-soul-"));
  try {
    await run(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("readSoulFile returns a template preview before the file exists", async () => {
  await withTempDir(async (dir) => {
    const result = await readSoulFile({ homeDir: dir, scope: "user" });
    assert.equal(result.source, "template");
    assert.match(result.content, /^# Soul/);
  });
});

test("writeSoulFile creates the user scope file and readSoulFile reports it as a file", async () => {
  await withTempDir(async (dir) => {
    await writeSoulFile({ homeDir: dir, scope: "user", content: "# saved soul\n" });
    assert.equal(await readFile(join(dir, ".mesaCode", "SOUL.md"), "utf8"), "# saved soul\n");

    const result = await readSoulFile({ homeDir: dir, scope: "user" });
    assert.equal(result.source, "file");
    assert.equal(result.content, "# saved soul\n");
  });
});

test("workspace scope writes to the workspace root and requires a root path", async () => {
  await withTempDir(async (dir) => {
    await writeSoulFile({ homeDir: dir, rootPath: dir, scope: "workspace", content: "# ws\n" });
    assert.equal(await readFile(join(dir, "SOUL.md"), "utf8"), "# ws\n");

    await assert.rejects(
      () => writeSoulFile({ homeDir: dir, scope: "workspace", content: "# ws\n" }),
      /workspace root path/i,
    );
  });
});

test("auto-generate stays draft-only and derives workspace facts from disk", async () => {
  await withTempDir(async (dir) => {
    await writeFile(
      join(dir, "package.json"),
      JSON.stringify({ name: "demo-app", dependencies: { react: "^19.0.0" } }),
      "utf8",
    );
    await writeFile(join(dir, "index.ts"), "export const value = 1;\n", "utf8");

    const draft = await buildAutoSoulContent({ scope: "workspace", rootPath: dir });
    assert.match(draft, /demo-app/);
    assert.match(draft, /TypeScript/);
    assert.match(draft, /React/);
    assert.match(draft, /security policy/);

    // Generation must not persist anything: the file is still absent until an explicit save.
    const result = await readSoulFile({ homeDir: dir, rootPath: dir, scope: "workspace" });
    assert.equal(result.source, "template");
    assert.notEqual(result.content, draft);
  });
});
