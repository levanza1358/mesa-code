import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (name) => readFile(`packages/ui/src/${name}`, "utf8");
const settings = await read("SettingsPage.tsx");
assert.ok(
  settings.includes(
    "quiet-studio-sidebar min-w-0 overflow-hidden border-r border-border bg-sidebar",
  ),
);
assert.ok(settings.includes("<WindowsTopLeftLogo showName />"));
assert.ok(settings.includes("h-9 w-full justify-start gap-2 rounded-lg px-2.5"));
for (const name of [
  "SettingsPage.tsx",
  "WorkspaceSidebar.tsx",
  "TaskListItem.tsx",
  "WorkspaceArchivedTasksFlatSection.tsx",
]) {
  assert.ok((await read(name)).includes("quiet-studio-nav-selected"), name);
}
const css = await read("quiet-studio.css");
assert.ok(css.includes("background-color: var(--color-accent)"));
assert.ok(css.includes("box-shadow: inset 2px 0 0 var(--color-brand)"));
console.log("Sidebar presentation parity checks passed.");
