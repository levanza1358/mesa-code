import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createFileService } from "../src/file/fileService.js";

async function withTempDir(run: (dir: string) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), "mesa-code-file-write-"));
  try {
    await run(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("writeTextFile overwrites an existing text file in place through the atomic writer", async () => {
  await withTempDir(async (dir) => {
    const target = join(dir, "smoke_test.py");
    await writeFile(target, "print('before')\n", "utf8");

    const fileService = createFileService();
    await fileService.writeTextFile({ path: target, content: "print('after')\n" });

    assert.equal(await readFile(target, "utf8"), "print('after')\n");

    // Read back through the same service so the write path stays observable end to end.
    const readBack = await fileService.readTextFile({ path: target });
    assert.equal(readBack.content, "print('after')\n");
    assert.equal(readBack.isBinary, false);
  });
});

test("writeTextFile leaves no temporary file behind", async () => {
  await withTempDir(async (dir) => {
    const target = join(dir, "notes.txt");
    await writeFile(target, "one\n", "utf8");

    const fileService = createFileService();
    await fileService.writeTextFile({ path: target, content: "two\n" });

    assert.deepEqual(await readdir(dir), ["notes.txt"]);
    assert.equal(await readFile(target, "utf8"), "two\n");
  });
});

test("writeTextFile rejects a directory target instead of creating a file", async () => {
  await withTempDir(async (dir) => {
    const fileService = createFileService();
    await assert.rejects(
      () => fileService.writeTextFile({ path: dir, content: "nope" }),
      /not a file/i,
    );
  });
});

test("writeTextFile refuses to create a file that does not exist yet", async () => {
  await withTempDir(async (dir) => {
    const fileService = createFileService();
    await assert.rejects(() =>
      fileService.writeTextFile({ path: join(dir, "does-not-exist.txt"), content: "nope" }),
    );
    assert.deepEqual(await readdir(dir), []);
  });
});
