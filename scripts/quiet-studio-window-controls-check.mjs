import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (path) => readFile(join(root, path), "utf8");

// Windows window controls are OS-native: the window keeps the system frame plus the Window Controls
// Overlay, and the renderer must never draw a second set of caption buttons on Windows. Linux keeps
// the renderer-drawn controls, so the single gate that suppresses them must stay Linux-only in all
// three hosts (workspace header, side pane, Settings). A platform list that drifts back to
// "Windows or Linux" would silently stack renderer buttons under the native ones again.
const [
  windowChrome,
  buttonPosition,
  headerHost,
  shellLayout,
  settingsHost,
  captionControls,
  chromeResolver,
] = await Promise.all([
  read("packages/desktop/src/main/desktopWindowChrome.ts"),
  read("packages/desktop/src/main/desktopWindowButtonPosition.ts"),
  read("packages/ui/src/WorkspaceHeader.tsx"),
  read("packages/ui/src/app-shell/WorkspaceShellLayout.tsx"),
  read("packages/ui/src/SettingsPage.tsx"),
  read("packages/ui/src/windowCaptionControls.ts"),
  read("packages/ui/src/app-shell/workspaceShellWindowChrome.ts"),
]);

const windowsVisualOptions = windowChrome.slice(
  windowChrome.indexOf('process.platform === "win32"'),
  windowChrome.indexOf("hasShadow: false"),
);
assert.ok(
  /frame: true/.test(windowsVisualOptions) &&
    /titleBarStyle: "hidden"/.test(windowsVisualOptions) &&
    /titleBarOverlay: true/.test(windowsVisualOptions),
  "Windows must expose the OS caption buttons via frame + titleBarStyle hidden + titleBarOverlay",
);
assert.ok(
  !/registerCustomWindowsControls|hasCustomWindowsControls|customWindowsControls/.test(
    windowChrome + buttonPosition,
  ),
  "The custom-windows-controls sentinel must stay deleted so the native overlay keeps its theme",
);
for (const [label, host] of [
  ["workspace header", headerHost],
  ["side pane", shellLayout],
  ["Settings", settingsHost],
]) {
  // Allow either the inline Linux-only expression or the shared isLinuxDesktop alias. The Linux-only
  // expression necessarily mentions isWindowsDesktop *negated*; the regression to catch is a positive
  // "Windows or Linux" OR, which would re-draw renderer buttons under the native ones on Windows.
  const gate = host.match(/usesInlineWindowControls = ([^\n;]+);/)?.[1] ?? "";
  const linuxAlias = host.match(/isLinuxDesktop = ([^\n;]+);/)?.[1];
  const linuxOnlyExpression = "Boolean(isDesktop && !isMacDesktop && !isWindowsDesktop)";
  const gateIsLinuxOnly =
    gate.trim() === linuxOnlyExpression ||
    (gate.trim() === "isLinuxDesktop" && linuxAlias === linuxOnlyExpression);
  const gateMentionsWindowsPositively =
    /isWindowsDesktop\s*\|\|/.test(gate) || /\|\|\s*isWindowsDesktop/.test(gate);
  assert.ok(
    gateIsLinuxOnly && !gateMentionsWindowsPositively,
    `${label} must suppress renderer window controls everywhere except Linux`,
  );
}

// Caption band appearance: clearing the native buttons is not enough; the right-side cells beside
// them must adopt the native caption geometry (full title-bar height, square, caption width) so the
// top bar reads as one band. That look is defined once in windowCaptionControls and must be enabled
// per host on Windows, otherwise ordinary rounded toolbar buttons sit next to square OS buttons. The
// editor button group is intentionally excluded because it is a bordered group.
const [actionSection, sidePaneHost] = await Promise.all([
  read("packages/ui/src/WorkspaceHeaderSections/WorkspaceHeaderActionSection.tsx"),
  read("packages/ui/src/app-shell/AnimatedSidePanePanel.tsx"),
]);
assert.ok(
  captionControls.includes("WINDOWS_CAPTION_CONTROL_CLASS") &&
    captionControls.includes("rounded-none") &&
    captionControls.includes("windows-caption-control-width"),
  "The native caption-cell class must define square, caption-width geometry",
);
assert.ok(
  /useWindowsCaptionSpacing=\{Boolean\(isWindowsDesktop\)\}/.test(shellLayout),
  "The workspace header must enable native caption spacing on Windows",
);
assert.ok(
  (actionSection.match(/useWindowsCaptionSpacing=\{useWindowsCaptionSpacing\}/g)?.length ?? 0) >= 3,
  "The header action cluster must forward caption spacing to each of its caption cells",
);
assert.ok(
  !actionSection.includes("WorkspaceHelpMenuButton"),
  "The workspace header must not draw a help cell; the workspace help button was removed",
);
assert.ok(
  /useWindowsCaptionSpacing=\{Boolean\(isWindowsDesktop\)\}/.test(sidePaneHost),
  "The side-pane close control must adopt caption spacing on Windows",
);
assert.ok(
  settingsHost.includes("settingsWindowsCaptionCellClass") &&
    /isWindowsDesktop && settingsWindowsCaptionCellClass/.test(settingsHost),
  "The Settings help control must adopt the caption cell on Windows",
);

// Caption band binding: adopting the caption look is not enough; the cells must also *sit* in the
// band. The band is a single overlay anchored to the window's right edge, not a group living inside a
// surface: the conversation header is nested in the resizable conversation panel, so a cell hosted
// there slides left while the side pane opens and jumps back as it closes. Pinning the cells to the
// window makes their place independent of the pane state. To avoid drawing a cell twice, the header
// and the side-pane strip must not render the terminal/side-pane cells on Windows; they only reserve
// the band width (`WINDOWS_CAPTION_BAND_RIGHT_INSET_PX`) so their own content stops before the cells.
const [sidePaneOpenTabHost, actionSectionHost, sharedPropsHost, captionActionGroup] =
  await Promise.all([
    read("packages/ui/src/app-shell/AnimatedSidePanePanel.tsx"),
    read("packages/ui/src/WorkspaceHeaderSections/WorkspaceHeaderActionSection.tsx"),
    read("packages/ui/src/WorkspaceHeaderSections/shared.ts"),
    read("packages/ui/src/WorkspaceCaptionActionGroup.tsx"),
  ]);
assert.ok(
  captionActionGroup.includes("WorkspaceTerminalToggleButton") &&
    captionActionGroup.includes("WorkspaceSidePaneToggleButton") &&
    (captionActionGroup.match(/useWindowsCaptionSpacing/g)?.length ?? 0) >= 2,
  "The shared caption action group must fix the terminal/side-pane cell pair in native caption spacing",
);
assert.ok(
  captionActionGroup.includes("data-windows-caption-band") &&
    captionActionGroup.includes("WINDOWS_CAPTION_CONTROLS_RIGHT_INSET_VAR") &&
    captionActionGroup.includes("absolute") &&
    captionActionGroup.includes("right-0"),
  "The caption cells must live in one overlay pinned to the window's right edge, padding the native band",
);
assert.ok(
  /isWindowsDesktop && shouldRenderMainViewHeader \? \(\s*<WorkspaceCaptionActionGroup/.test(
    shellLayout,
  ),
  "The shell must host the window-pinned caption band whenever the main-view header is shown",
);
assert.ok(
  (shellLayout.match(/WINDOWS_CAPTION_BAND_RIGHT_INSET_PX/g)?.length ?? 0) >= 2,
  "The shell must reserve the band width so the side-pane strip content stops before the pinned cells",
);
assert.ok(
  headerHost.includes("WINDOWS_CAPTION_BAND_RIGHT_INSET_PX") &&
    headerHost.includes("captionBandOwnsCells={Boolean(isWindowsDesktop)}"),
  "The inner header must reserve the band width and stop drawing its own cells on Windows",
);
assert.ok(
  /\{!captionBandOwnsCells \? \(/.test(actionSectionHost) &&
    sharedPropsHost.includes("captionBandOwnsCells?: boolean"),
  "The header action cluster must drop the cells the window-pinned band already owns, so none is drawn twice",
);
assert.ok(
  sidePaneOpenTabHost.includes("!isWindowsDesktop ? ("),
  "The side-pane strip must not draw a second side-pane toggle on Windows",
);

// Workspace surface framing: on Windows the OS owns the outer window edge, so the renderer panels
// must not paint a second decorative outline. A non-empty frame for Windows (or a panel-frame literal
// left at a call site) is the regression that re-introduces the framed-card look the user rejected.
const windowsFramelessReturns =
  chromeResolver.match(/if \(isWindowsDesktop\) return "";/g)?.length ?? 0;
assert.ok(
  windowsFramelessReturns >= 2,
  "Both the window-chrome and inner-panel frame resolvers must return no frame on Windows",
);
assert.ok(
  !shellLayout.includes('"rounded-(--workspace-panel-radius) border border-border"') &&
    !shellLayout.includes("supportsNativeRoundedCorners") &&
    shellLayout.includes("resolveWorkspaceShellPanelFrameClass"),
  "Workspace panels must route framing through the shared resolver instead of hardcoding an outline",
);
// Dropping the decorative frame removes the only visible edge between the conversation column and an
// open side pane, because the pane's resize handle is intentionally transparent. A boundary between
// two distinct surfaces must still read, so the conversation column draws a full-height right divider
// while the pane is open, and only on Windows (Linux/macOS keep the framed panel border and would
// otherwise show a doubled line). The divider must span the whole column (`absolute inset-y-0`), not
// just the conversation section: the open terminal is docked beneath the section, so a section-only
// border would stop at the terminal's top edge and leave the bottom bar without an edge.
assert.ok(
  /absolute inset-y-0 right-0 z-10 border-r border-border/.test(shellLayout) &&
    /isSidePaneVisible && isWindowsDesktop \? \(/.test(shellLayout) &&
    shellLayout.includes('"relative flex h-full min-h-0 flex-col"'),
  "The conversation-to-side-pane boundary must stay visible on Windows while the side pane is open",
);

// Settings must not retain the decorative frame removed from Windows workspace panels.
const settingsPanelFrame = settingsHost.match(
  /data-settings-panel-frame="true"\s+className=\{cn\(([\s\S]*?)\)\}/,
)?.[1];
assert.ok(
  settingsPanelFrame?.includes('"relative flex flex-col min-h-0 h-full bg-background"') &&
    settingsPanelFrame.includes('!isWindowsDesktop && "rounded-xl border border-border"') &&
    !settingsPanelFrame.includes("rounded-[5px]"),
  "Settings must omit its outer border and rounding on Windows while preserving other platforms",
);

// Border removal alone leaves the wrapper's 4px padding and drag spacer visible.
assert.ok(
  settingsHost.includes('isDesktop && !isWindowsDesktop ? "p-1 pl-0 pt-0" : "p-0"') &&
    settingsHost.includes('isDesktop && !isWindowsDesktop && "h-1"') &&
    settingsHost.includes('className="flex h-12 shrink-0"') &&
    settingsHost.includes("marginRight: `${nativeWindowsCaptionInsetPx}px`"),
  "Windows Settings must remove decorative gutters while retaining its header and native safe area",
);
assert.equal(
  settingsHost.match(/!usesInlineWindowControls && !isWindowsDesktop \? \(/g)?.length,
  2,
  "Both Settings help mounts must be absent on Windows; other platforms retain their help controls",
);

console.info("Windows native window controls and caption band source checks passed.");
