// Regression coverage for the web phone layout (docs/specs/quiet-studio-mobile-web-layout.md).
//
// The phone layout is web-only: it must never change the desktop shell. Every
// mobile branch is therefore gated behind `isDesktop === false`, and the single
// gate is `isMobileWeb` (the `useIsMobileWeb` hook, which is always false on
// desktop). These tests pin the gate, the master-detail Settings behaviour, and
// the breakpoint the hook and the `max-md:` CSS must share — so a future edit
// cannot silently leave a mobile-only drawing path ungated, or drift the JS
// breakpoint away from Tailwind's `md`.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import enUS from "../src/i18n/locales/en-US.js";
import zhCN from "../src/i18n/locales/zh-CN.js";
import { MOBILE_WEB_MEDIA_QUERY, shouldUseMobileWebLayout } from "../src/hooks/useIsMobileWeb.js";

const shellSource = readFileSync(
  resolve(import.meta.dirname, "..", "src", "app-shell", "WorkspaceShellLayout.tsx"),
  "utf8",
);
const settingsSource = readFileSync(
  resolve(import.meta.dirname, "..", "src", "SettingsPage.tsx"),
  "utf8",
);
const headerSource = readFileSync(
  resolve(import.meta.dirname, "..", "src", "WorkspaceHeader.tsx"),
  "utf8",
);
const hookSource = readFileSync(
  resolve(import.meta.dirname, "..", "src", "hooks", "useIsMobileWeb.ts"),
  "utf8",
);

test("the phone layout predicate is disabled on desktop at any width", () => {
  // Desktop must never enter the mobile branch, even if a window is narrowed.
  assert.equal(
    shouldUseMobileWebLayout({ isDesktop: true, matchesMobileMediaQuery: true }),
    false,
    "a desktop host must never use the web phone layout",
  );
  assert.equal(
    shouldUseMobileWebLayout({ isDesktop: undefined, matchesMobileMediaQuery: false }),
    false,
    "a wide web viewport is not the phone layout",
  );
  assert.equal(
    shouldUseMobileWebLayout({ isDesktop: false, matchesMobileMediaQuery: true }),
    true,
    "the web client at a phone width uses the phone layout",
  );
});

test("the JS breakpoint matches Tailwind's md (max-width: 767px)", () => {
  assert.equal(MOBILE_WEB_MEDIA_QUERY, "(max-width: 767px)");
  assert.match(
    hookSource,
    /return !params\.isDesktop && params\.matchesMobileMediaQuery;/,
    "the hook must keep the isDesktop gate in its return",
  );
});

test("the shell gates the drawer, scrim and content floor on isMobileWeb", () => {
  assert.match(
    shellSource,
    /const isMobileWeb = useIsMobileWeb\(isDesktop\);/,
    "the shell must derive isMobileWeb from useIsMobileWeb(isDesktop)",
  );
  // The off-canvas drawer geometry hangs off isMobileWeb; the in-flow sidebar
  // column (CSS-var width) must remain in the non-mobile branch.
  assert.ok(
    shellSource.includes("absolute inset-y-0 left-0 z-40 w-[min(85vw,320px)] max-w-none"),
    "the mobile drawer geometry must be present and gated",
  );
  assert.ok(
    shellSource.includes("w-(--workspace-sidebar-panel-width) max-w-[50%]"),
    "the desktop in-flow sidebar column must remain",
  );
  // The scrim only renders with the drawer open on mobile.
  assert.match(
    shellSource,
    /isMobileDrawerOverlay \? \(/,
    "the scrim must be gated by isMobileDrawerOverlay",
  );
  assert.ok(shellSource.includes("TID_MOBILE_SIDEBAR_SCRIM"), "the scrim must carry its test id");
  // The content column floor is dropped ONLY on mobile; the un-gated literal
  // (which would break the 390px viewport) must not come back.
  assert.equal(
    shellSource.includes('"flex min-w-[320px] flex-1 flex-col"'),
    false,
    "the content column must not keep an unconditional min-w-[320px]",
  );
  assert.ok(
    shellSource.includes('!isMobileWeb && "min-w-[320px]"'),
    "the content column floor must be gated by isMobileWeb",
  );
  // The full-screen Automations view has no workspace header, so it must render
  // its own drawer toggle (also gated) or a mobile user is stranded there.
  assert.ok(
    shellSource.includes("<MobileSidebarToggleButton onToggleSidebar={handleToggleSidebar} />"),
    "the Automations main view must render the drawer toggle on mobile",
  );
});

test("the header renders the drawer button only on the mobile web layout", () => {
  assert.match(
    headerSource,
    /isMobileWeb \? \(/,
    "the header mobile controls must be gated by isMobileWeb",
  );
  assert.ok(
    headerSource.includes("MobileSidebarToggleButton"),
    "the header must render the mobile drawer toggle",
  );
  // The task navigation (back / forward / new task) is rendered inline in the
  // header on mobile so all buttons line up; it must not be left to the overlay.
  assert.ok(
    headerSource.includes("onGoBack") && headerSource.includes("ArrowLeftIcon"),
    "the header must render the task-navigation buttons inline on mobile",
  );
});

test("the floating top overlay does not overlap the mobile header", () => {
  // The overlay is absolutely positioned at the top-left; on the phone layout the
  // header already carries the same controls inline, so the overlay must be
  // hidden or it draws on top of the header (the reported overlap).
  assert.match(
    shellSource,
    /\{!isMobileWeb \? \(\s*<ScopedErrorBoundary\s+scope="desktop-top-overlay"/,
    "the desktop top overlay must be gated off on the mobile web layout",
  );
  // The header must receive the navigation props it now renders inline.
  assert.match(
    shellSource,
    /isMobileWeb=\{isMobileWeb\}[\s\S]*?onGoBack=\{primaryNavigationBack\}/,
    "the shell must pass the task-navigation callbacks to the header",
  );
});

test("Settings keeps its fixed nav column and adds a mobile master-detail gate", () => {
  // The desktop grid must stay byte-identical (settingsSidebarLabels.test.ts pins
  // this literal too); mobile only appends a single-column override.
  assert.match(settingsSource, /grid-cols-\[264px_minmax\(0,1fr\)\]/);
  assert.ok(
    settingsSource.includes("max-md:grid-cols-1"),
    "the settings grid must collapse to a single column on mobile",
  );
  assert.match(
    settingsSource,
    /const isMobileWeb = useIsMobileWeb\(isDesktop\);/,
    "Settings must derive isMobileWeb from useIsMobileWeb(isDesktop)",
  );
  // Exactly one column is visible at a time, chosen by activeMobileSection.
  assert.ok(
    settingsSource.includes('isMobileWeb && activeMobileSection !== null && "hidden"'),
    "the nav column must hide while a section's content is open on mobile",
  );
  assert.ok(
    settingsSource.includes('isMobileWeb && activeMobileSection === null && "hidden"'),
    "the content column must hide until a section is open on mobile",
  );
});

test("new phone-layout message ids are catalogued in both locales", () => {
  for (const [locale, catalog] of Object.entries({ "en-US": enUS, "zh-CN": zhCN })) {
    for (const id of ["workspace.mobileMenu", "settings.mobileBackToList"]) {
      const translation = (catalog as Record<string, string>)[id];
      assert.equal(typeof translation, "string", `${locale} must define ${id}`);
      assert.notEqual(translation, id, `${locale} must not render the raw id ${id}`);
    }
  }
});
