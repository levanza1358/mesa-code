import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const band = await read("../packages/ui/src/WorkspaceCaptionActionGroup.tsx");
const header = await read(
  "../packages/ui/src/WorkspaceHeaderSections/WorkspaceHeaderActionSection.tsx",
);
const editor = await read("../packages/ui/src/WorkspaceEditorButtonGroup.tsx");
assert.ok(band.includes("<WorkspaceEditorButtonGroup"));
assert.ok(band.includes("remoteTarget={remoteTarget}"));
assert.ok(band.includes("workspaceIdentity={workspaceIdentity}"));
assert.ok(header.includes('variant === "task" && !captionBandOwnsCells'));
assert.ok(editor.includes("flex h-12 items-stretch overflow-hidden"));
assert.ok(editor.includes("h-12 w-8 rounded-none border-0"));
console.log("Editor caption band source checks passed.");
