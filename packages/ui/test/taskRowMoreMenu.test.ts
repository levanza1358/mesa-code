// Regression coverage for the phone-layout "…" task-row menu
// (docs/specs/quiet-studio-mobile-web-layout.md, product rule 14).
//
// A touch screen has no right mouse button and fires no `contextmenu`, so the
// desktop right-click task menus are unreachable on a phone. Long-press cannot
// stand in for it because the grouped rows are dnd-kit draggables. Instead each
// row renders a "…" button (touch-only) that opens the *same* action set through
// a DropdownMenu. These tests pin the gate, the shared single source of actions,
// and that the desktop path is untouched.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { TID_TASK_ROW_MORE_BUTTON } from "@mesa-code/shared";

const uiSrc = (...parts: string[]): string =>
  readFileSync(resolve(import.meta.dirname, "..", "src", ...parts), "utf8");

const moreMenuShell = uiSrc("TaskRowMoreMenu.tsx");
const taskListItem = uiSrc("TaskListItem.tsx");
const taskList = uiSrc("TaskList.tsx");
const timelineSection = uiSrc("WorkspaceTimelineTasksSection.tsx");
const groupedRow = uiSrc("workspace-grouped-tasks", "task-row.tsx");
const groupedMenu = uiSrc("workspace-grouped-tasks", "task-context-menu-content.tsx");
const touchHook = uiSrc("hooks", "useIsTouchInput.ts");
const actionBody = uiSrc("TaskActionMenuContent.tsx");

test("the touch signal uses the hover media query and defaults off", () => {
  assert.ok(
    touchHook.includes('"(hover: none)"'),
    "the touch gate must key on (hover: none) so a mouse desktop is unaffected",
  );
  assert.match(
    touchHook,
    /useState\(false\)/,
    "the detector must default to false (no touch UI before matchMedia confirms)",
  );
});

test("the row menu is a DropdownMenu that mounts its body only while open", () => {
  // DropdownMenu (not ContextMenu) — it is opened by the explicit "…" button.
  assert.ok(
    moreMenuShell.includes("DropdownMenuTrigger") && !moreMenuShell.includes("ContextMenuTrigger"),
    "the row menu must be a DropdownMenu with its own trigger",
  );
  // Body is gated on `open` so per-row path resolution stays lazy.
  assert.match(
    moreMenuShell,
    /\{open \? \(/,
    "the menu body must render only while the menu is open",
  );
  assert.ok(moreMenuShell.includes("Ellipsis"), "the trigger must render the ellipsis icon");
  assert.ok(
    moreMenuShell.includes("stopPropagation"),
    "a menu tap must not fall through to the row (select / drag)",
  );
});

test("the shared task-action body backs both entry points (single source of truth)", () => {
  // The right-click menu and the "…" menu must render the identical body.
  assert.ok(
    taskListItem.includes("TaskListItemContextMenu") &&
      taskListItem.includes("TaskListItemMoreMenu"),
    "both the right-click and the '…' menus must be defined from the shared builder",
  );
  assert.match(
    taskListItem,
    /useTaskActionMenuProps\(/,
    "both menus must derive their props from the shared useTaskActionMenuProps hook",
  );
  assert.ok(
    actionBody.includes("TaskActionMenuContent"),
    "the action body must remain the shared component",
  );
});

test("TaskListItem renders the '…' button only when showMoreMenu is set", () => {
  assert.match(
    taskListItem,
    /showMoreMenu = false,/,
    "showMoreMenu must default to false so a desktop row never renders the button",
  );
  assert.match(
    taskListItem,
    /showMoreMenu \? \(\s*<TaskListItemMoreMenu/,
    "the '…' button must be gated on showMoreMenu",
  );
  assert.ok(
    taskListItem.includes("TID_TASK_ROW_MORE_BUTTON"),
    "the '…' button must carry its test id",
  );
  assert.ok(
    taskListItem.includes("showMoreMenu === right.showMoreMenu"),
    "the memo comparator must include showMoreMenu",
  );
});

test("the project/timeline lists pass showMoreMenu only on touch input", () => {
  for (const [name, source] of [
    ["TaskList", taskList],
    ["WorkspaceTimelineTasksSection", timelineSection],
  ] as const) {
    assert.ok(
      source.includes("useIsTouchInput()"),
      `${name} must derive the touch signal from useIsTouchInput()`,
    );
    assert.ok(
      source.includes("showMoreMenu={isTouchInput}"),
      `${name} must pass showMoreMenu gated on the touch signal`,
    );
  }
});

test("the grouped row renders the '…' menu on touch, sharing the group actions", () => {
  assert.match(
    groupedRow,
    /canShowHoverActions && isHoverNone \? \(/,
    "the grouped '…' button must be gated on touch and skip the drag overlay",
  );
  assert.ok(
    groupedRow.includes("TaskRowMoreMenu") && groupedRow.includes("TID_TASK_ROW_MORE_BUTTON"),
    "the grouped row must render the '…' menu with its test id",
  );
  // Group actions come from one body rendered through either menu family.
  assert.ok(
    groupedMenu.includes("GroupedTaskMenuBody") &&
      groupedMenu.includes("GROUPED_TASK_CONTEXT_MENU_PRIMITIVES") &&
      groupedMenu.includes("GROUPED_TASK_DROPDOWN_MENU_PRIMITIVES"),
    "the grouped actions must be one body rendered through both menu families",
  );
  assert.ok(
    groupedRow.includes("GroupedTaskDropdownMenuItems"),
    "the grouped '…' menu must use the dropdown-items variant (single content wrapper)",
  );
});

test("the row-more test id is a stable shared constant", () => {
  assert.equal(TID_TASK_ROW_MORE_BUTTON, "task-row-more-button");
});
