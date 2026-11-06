import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const uiSrc = (...parts: string[]): string =>
  readFileSync(resolve(import.meta.dirname, "..", "src", ...parts), "utf8");

const timeline = uiSrc("WorkspaceTimelineTasksSection.tsx");
const grouped = uiSrc("WorkspaceGroupedTasksSection.tsx");

test("timeline keeps committed rows while a refresh is loading", () => {
  assert.match(
    timeline,
    /lastVisibleItemsRef[\s\S]*visibleItems =\s*items\.length === 0[\s\S]*lastVisibleItemsRef\.current/,
    "background refresh must not replace existing rows with a loading/empty view",
  );
  assert.match(
    timeline,
    /if \(visibleItems\.length === 0 && loading\)/,
    "the loading placeholder must remain limited to the first empty load",
  );
});

test("grouped task content stays mounted after the first painted list", () => {
  assert.match(
    grouped,
    /hasPaintedGroupedListRef[\s\S]*shouldHideGroupedTaskContent\(/,
    "grouped view must use its first-paint latch around the loading gate",
  );
  assert.match(
    grouped,
    /hasPaintedOnce: hasPaintedGroupedListRef\.current/,
    "background refresh must not remount the grouped task section",
  );
});
