// The inline-edit draft store is the single owner of unsaved code-viewer edits: closing a tab
// must consult its dirty keys, and a draft must survive re-activation. These cases pin the
// store contract (dirty detection, reuse, discard) that the close guard and the editor rely on.
import assert from "node:assert/strict";
import { test } from "node:test";
import { codeViewerEditDraftStore } from "../src/lib/codeViewerEditDraftStore.js";

test("a draft equal to the base is not dirty", () => {
  codeViewerEditDraftStore.clearForTest();
  codeViewerEditDraftStore.setDraft("ws:file:/tmp/a.py", "print(1)\n", "print(1)\n");
  assert.equal(codeViewerEditDraftStore.isDirty("ws:file:/tmp/a.py"), false);
  assert.deepEqual(codeViewerEditDraftStore.dirtyKeys(), []);
});

test("a divergent draft is dirty and keeps its base for diffing", () => {
  codeViewerEditDraftStore.clearForTest();
  codeViewerEditDraftStore.setDraft("ws:file:/tmp/a.py", "print(1)\n", "print(2)\n");
  assert.equal(codeViewerEditDraftStore.isDirty("ws:file:/tmp/a.py"), true);
  assert.deepEqual(codeViewerEditDraftStore.dirtyKeys(), ["ws:file:/tmp/a.py"]);
  const entry = codeViewerEditDraftStore.get("ws:file:/tmp/a.py");
  assert.equal(entry?.base, "print(1)\n");
  assert.equal(entry?.draft, "print(2)\n");
});

test("typing back to the base clears the dirty flag without a separate discard", () => {
  codeViewerEditDraftStore.clearForTest();
  const key = "ws:file:/tmp/a.py";
  codeViewerEditDraftStore.setDraft(key, "base\n", "changed\n");
  assert.equal(codeViewerEditDraftStore.isDirty(key), true);
  codeViewerEditDraftStore.setDraft(key, "base\n", "base\n");
  assert.equal(codeViewerEditDraftStore.isDirty(key), false);
  assert.equal(codeViewerEditDraftStore.get(key), undefined);
});

test("drafts are isolated per code-viewer source identity", () => {
  codeViewerEditDraftStore.clearForTest();
  codeViewerEditDraftStore.setDraft("ws-a:file:/tmp/a.py", "a\n", "a edited\n");
  codeViewerEditDraftStore.setDraft("ws-b:file:/tmp/a.py", "b\n", "b edited\n");
  assert.deepEqual(codeViewerEditDraftStore.dirtyKeys().sort(), [
    "ws-a:file:/tmp/a.py",
    "ws-b:file:/tmp/a.py",
  ]);
  codeViewerEditDraftStore.clearMany(["ws-a:file:/tmp/a.py"]);
  assert.equal(codeViewerEditDraftStore.isDirty("ws-a:file:/tmp/a.py"), false);
  assert.equal(codeViewerEditDraftStore.isDirty("ws-b:file:/tmp/a.py"), true);
});

test("clear discards one draft and clearForTest drops them all", () => {
  codeViewerEditDraftStore.clearForTest();
  const key = "ws:file:/tmp/a.py";
  codeViewerEditDraftStore.setDraft(key, "base\n", "kept\n");
  codeViewerEditDraftStore.clear(key);
  assert.equal(codeViewerEditDraftStore.get(key), undefined);

  codeViewerEditDraftStore.setDraft("ws:file:/tmp/b.py", "base\n", "kept\n");
  codeViewerEditDraftStore.clearForTest();
  assert.deepEqual(codeViewerEditDraftStore.dirtyKeys(), []);
});
