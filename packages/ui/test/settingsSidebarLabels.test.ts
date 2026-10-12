import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

/**
 * Regression coverage for the Settings sidebar labels.
 *
 * Symptom: at window widths below Tailwind's `lg` breakpoint (1024px) the
 * Settings sidebar lost its text — no group titles and no section names, only
 * icons and dividers.
 *
 * Cause: two `max-lg:sr-only` classes (visually hidden below `lg`) sat on the
 * group title and on the shared sidebar button's label wrapper. `sr-only` keeps
 * text in the accessibility tree, so assistive technology still read it, while
 * sighted users saw nothing.
 *
 * The spec requires the sidebar to show three titled groups (General, Agent,
 * Data), so the labels must be visible at every width.
 */

const settingsPageSource = readFileSync(
  resolve(import.meta.dirname, "..", "src", "SettingsPage.tsx"),
  "utf8",
);

test("settings sidebar does not hide labels below the lg breakpoint", () => {
  assert.equal(
    settingsPageSource.includes("max-lg:sr-only"),
    false,
    "sidebar group titles and section labels must stay visible at every width",
  );
});

test("settings shell does not reserve an empty workspace-sidebar column", () => {
  // Regression: the settings grid used to be
  //   grid-cols-[var(--workspace-sidebar-width)_minmax(0,1fr)]
  // while the workspace shell stayed mounted but transparent. Nothing filled the
  // first column, so it rendered as an empty band and pushed the settings nav
  // into column 2, making the nav look like a detached narrow strip in the middle
  // of the window. The nav now owns a fixed first column and content fills the rest.
  assert.equal(
    settingsPageSource.includes("grid-cols-[var(--workspace-sidebar-width)_minmax(0,1fr)]"),
    false,
    "the settings grid must not reserve a workspace-sidebar-width column",
  );
  assert.match(
    settingsPageSource,
    /className="relative grid h-screen min-h-full w-full grid-cols-\[264px_minmax\(0,1fr\)\]/,
    "the settings grid must give the nav a fixed column and content the remainder",
  );
});

test("settings sidebar renders the group title element unconditionally", () => {
  // The group title div must carry its text styling without a visibility gate.
  assert.match(
    settingsPageSource,
    /className="px-2\.5 pb-1 text-ui-sm font-medium text-foreground-subtlest"/,
    "the group title element must not be conditionally hidden",
  );
});

test("settings sidebar button keeps its label wrapper in normal flow", () => {
  // The wrapper for `children ?? label` must not be clipped.
  assert.match(
    settingsPageSource,
    /<span className="min-w-0 flex-1">\s*\{children \?\?/,
    "the sidebar button label wrapper must not hide its content",
  );
});

test("settings sidebar does not collapse into an icon-only rail below the lg breakpoint", () => {
  // Regression: the nav button carried `max-lg:mx-auto max-lg:size-10
  // max-lg:justify-center max-lg:px-0`, which shrank each row to a 40px icon and
  // hid the label below 1024px. The settings nav column stays 264px, so the
  // shrunken icons floated in a wide empty column instead of reading as a rail.
  // The spec requires section names to stay visible at every width, so the
  // icon-only shrink must not come back.
  for (const railClass of [
    "max-lg:mx-auto",
    "max-lg:size-10",
    "max-lg:justify-center",
    "max-lg:px-0",
  ]) {
    assert.equal(
      settingsPageSource.includes(railClass),
      false,
      `the settings sidebar button must not shrink into a rail (${railClass})`,
    );
  }
});

test("settings sidebar footer stays visible at every width", () => {
  // The footer must not be hidden below the lg breakpoint; it holds the
  // Settings-only Back/exit action, so hiding it leaves the sidebar without its
  // bottom action at narrow widths.
  assert.equal(
    settingsPageSource.includes("max-lg:hidden"),
    false,
    "the settings sidebar footer must not be hidden at narrow widths",
  );
  assert.match(
    settingsPageSource,
    /<div className="shrink-0">\s*<WorkspaceSidebarFooter/,
    "the footer wrapper must remain in normal flow at every width",
  );
});
