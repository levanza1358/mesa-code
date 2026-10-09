import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const settings = await readFile(
  new URL("../packages/ui/src/SettingsPage.tsx", import.meta.url),
  "utf8",
);
const root = await readFile(new URL("../packages/ui/src/Root.tsx", import.meta.url), "utf8");
const workspace = await readFile(
  new URL("../packages/ui/src/root/RootWorkspaceContent.tsx", import.meta.url),
  "utf8",
);
assert.ok(settings.indexOf("<WorkspaceSidebarFooter") > settings.indexOf("</nav>"));
assert.ok(settings.includes('className="border-t border-border px-2 py-2"'));
assert.ok(settings.includes("min-h-0 flex-1 overflow-y-auto"));
for (const source of [root, workspace]) {
  assert.ok(source.includes("<AnimatePresence>"));
  assert.ok(source.includes('<SettingsTransition key="settings">'));
}
assert.ok(workspace.includes("useIsPresent()"));
assert.ok(workspace.includes("useReducedMotion()"));
assert.ok(workspace.includes("duration: reducedMotion ? 0 : 0.2"));
assert.ok(workspace.includes("ease: [0.22, 1, 0.36, 1]"));
assert.ok(workspace.includes("initial={{ opacity: 0 }}"));
assert.ok(workspace.includes("animate={{ opacity: 1 }}"));
assert.ok(workspace.includes("exit={{ opacity: 0 }}"));
assert.ok(workspace.includes("inert={!isPresent ? true : undefined}"));
assert.ok(workspace.includes('pointerEvents: isPresent ? "auto" : "none"'));
console.log("Settings footer and transition source checks passed.");
