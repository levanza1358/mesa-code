import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (path) => readFile(join(root, path), "utf8");
// Source invariants only; real overlay interaction coverage runs separately.
const pillMain = await read("packages/desktop/src/main/index.ts");
assert.ok(pillMain.includes("createNotificationPillOverlay"));
assert.ok(pillMain.includes("notificationPillOverlay?.dispose()"));
assert.ok(pillMain.includes("!notificationPillOverlay?.ownsWindow(win)"));
assert.ok((await read("packages/desktop/vite.config.ts")).includes('"notification-pill":'));
assert.ok((await read("packages/desktop/tsup.config.ts")).includes('"preload/notification-pill":'));
assert.ok(
  !(await read("packages/desktop/src/renderer/src/notification-pill.ts")).includes("innerHTML"),
);
assert.ok((await read("packages/shared/src/notification-pill.ts")).includes(".strict()"));
assert.ok(
  (await read("packages/ui/src/hooks/useTaskNotifications.ts")).includes(
    "session?.lastAssistantPreview",
  ),
);
const [css, sidebar, appearance, launch, manifest, web] = await Promise.all([
  read("packages/ui/src/quiet-studio.css"),
  read("packages/ui/src/WorkspaceSidebar.tsx"),
  read("packages/ui/src/settingsCodePreview.tsx"),
  read("scripts/quiet-studio-dev.mjs"),
  read("package.json"),
  read("packages/web/vite.config.ts"),
]);
for (const theme of ["zai-light", "zai-dark", "black"]) {
  assert.ok(css.includes(`:root.theme-${theme}`), `Missing ${theme} surface`);
}
assert.ok(!css.includes("--color-brand:"), "Surface must not overwrite accent");
assert.ok(!css.includes("font-size:"), "Existing UI/mobile font scale must remain owner");
assert.ok(css.includes("prefers-reduced-motion"));
assert.ok(!/quiet-studio-rail|Settings2/.test(sidebar), "Duplicate rail must be removed");
assert.ok(
  sidebar.match(/onClick=\{onOpenCommandCenter\}/g)?.length === 1,
  "Sidebar must expose one Search action",
);
assert.ok(
  sidebar.match(/onClick=\{handleOpenAutomationsMain\}/g)?.length === 1,
  "Sidebar must expose one Automations action",
);
assert.ok(sidebar.includes("aria-pressed={automationsActive}"));
assert.ok(sidebar.includes("emphasis"), "New task must be the primary sidebar action");
assert.ok(
  sidebar.indexOf("<WorkspaceSidebarFooter") > sidebar.indexOf("overflow-y-auto"),
  "Account and Settings must sit in the sidebar footer after the scroll area",
);
assert.ok(
  !sidebar.includes("Settings2") && sidebar.includes("onSettingsButtonClick={openSettingsTab}"),
  "Settings must remain reachable without a second navigation button",
);
assert.ok(appearance.includes("quiet-studio-preview"));
assert.ok(appearance.includes("THEME_MODES.map"));
assert.ok(appearance.includes("ACCENT_OPTIONS.map"));
assert.ok(appearance.includes("px-4 sm:px-5"), "Appearance rows must have comfortable padding");
assert.ok(!appearance.includes("w-12 shrink-0"), "App preview must not restore a second rail");
const settingsParts = await read("packages/ui/src/settings/SettingsPageParts.tsx");
assert.ok(settingsParts.includes("code-theme-"), "Code theme selectors stay");
assert.ok(settingsParts.includes("getCodeThemeOptionsForMode"), "Selectors stay mode-correct");
assert.ok(
  (await read("packages/ui/src/lib/adaptive-code-theme.ts")).includes('"--mesa-code-syntax-"'),
  "Adaptive palette must use the dedicated syntax prefix",
);
assert.ok(
  css.includes("--mesa-code-syntax-token-keyword: var(--color-brand)"),
  "Keyword tokens must follow the selected accent",
);
for (const key of ["token-comment", "token-string", "token-constant", "token-function"]) {
  assert.ok(css.includes(`--mesa-code-syntax-${key}:`), `Missing syntax token ${key}`);
}
assert.ok(
  !/BundledTheme/.test(await read("packages/ui/src/components/ui/code-viewer.tsx")),
  "Code viewer must accept adaptive code themes",
);
assert.ok(
  (await read("packages/ui/src/lib/diffsHighlighterEngine.ts")).includes(
    "registerAdaptiveCodeThemes",
  ),
  "Diff workers must receive the adaptive palette definitions",
);
const settingsPage = await read("packages/ui/src/SettingsPage.tsx");
assert.ok(
  settingsPage.includes("if (isTheme(value))"),
  "Theme action must reuse catalog validation",
);
for (const entry of ["packages/desktop/src/renderer/src/main.tsx", "packages/web/src/main.tsx"]) {
  assert.ok(
    (await read(entry)).includes("applyTheme("),
    "Startup must reuse shared theme application",
  );
}
for (const key of [
  "MESA_CODE_DATA_BASE_DIR",
  "MESA_CODE_DESKTOP_HOME_DIR",
  "MESA_CODE_DESKTOP_USER_DATA_DIR",
  "MESA_CODE_DESKTOP_SESSION_DATA_DIR",
]) {
  assert.ok(launch.includes(key), `Missing isolation ${key}`);
}
assert.ok(JSON.parse(manifest).scripts["dev:web"].includes("quiet-studio-dev"));
assert.ok(web.includes("localhost:3031"));
for (const name of await readdir(root)) {
  assert.ok(
    !name.startsWith(".env") || name === ".env.example",
    `Unexpected environment file ${name}`,
  );
}
const [errorBanner, quotaBanner, greeting, composer, sessionPane, english, chinese] =
  await Promise.all([
    read("packages/ui/src/ChatErrorBanner.tsx"),
    read("packages/ui/src/v4/ConversationQuotaBanner.tsx"),
    read("packages/ui/src/v4/ConversationDraftEmptyState.tsx"),
    read("packages/ui/src/v4/ConversationComposer.tsx"),
    read("packages/ui/src/v4/SessionPane.tsx"),
    read("packages/ui/src/i18n/locales/en-US.ts"),
    read("packages/ui/src/i18n/locales/zh-CN.ts"),
  ]);
for (const banner of [errorBanner, quotaBanner]) {
  assert.ok(
    !/CodingPlanEntryButton|RocketIcon|onOpenUpgrade|onUpgrade|upgradeActionLabelId/.test(banner),
    "Conversation banners must not offer Upgrade",
  );
}
assert.ok(errorBanner.includes("onClick={onOpenModelSettings}"), "Model setup action must remain");
assert.ok(errorBanner.includes("onClick={onDismiss}"), "Error dismissal must remain");
assert.ok(
  errorBanner.includes("break-words"),
  "Recovery message must remain readable at narrow widths",
);
assert.ok(quotaBanner.includes("state.dismissible"), "Quota dismissal rule must remain");
assert.ok(
  !/MesaCodeEmptyStateLogo|<svg/.test(greeting),
  "Draft greeting must not contain a decorative logo",
);
assert.ok(greeting.includes("mb-4"), "Draft greeting spacing must remain compact");
assert.ok(greeting.includes("getNextChatEmptyGreetingDelayMs(greetingDate)"));
assert.ok(greeting.includes("new ResizeObserver(scheduleMeasure)"));
assert.ok(!composer.includes("onOpenModelUpgrade"));
assert.ok(composer.includes('shellClassName="quiet-studio-composer-editor"'));
assert.ok(css.includes("border: 0 !important;"), "Nested editor frame must remain removed");
assert.ok(composer.includes("data-composer-project"), "Project selector must stay in toolbar");
assert.ok(
  composer.indexOf("data-composer-project") > composer.indexOf("leadingActions={"),
  "Project selector must use existing toolbar slot",
);
assert.ok(
  composer.indexOf('{modelGuidanceBelow ? <div className="mt-2') >
    composer.indexOf("onPaste={attachmentsApi.handlePaste}"),
  "Draft model guidance must follow editor surface",
);
assert.ok(composer.includes("isModelConfigMissingError(visibleError)"));
assert.ok(errorBanner.includes('modelConfigMissing ? "text-ui-caption"'));
assert.ok(css.includes("flex-wrap: wrap;"), "Toolbar must fit narrow widths");
const queuePanel = await read("packages/ui/src/v4/ConversationQueuePanel.tsx");
// Comments may name the old classes for history; only real code must stay clean.
const queuePanelCode = queuePanel.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
assert.ok(
  queuePanel.includes("quiet-studio-queue-sheet"),
  "Queued sheet must use the shared joined-surface class",
);
assert.ok(
  css.includes(".quiet-studio-conversation .quiet-studio-queue-sheet"),
  "Queued sheet joined-surface rule must exist",
);
assert.ok(
  css.includes("border-bottom: 0;"),
  "Queued sheet must drop its bottom border at the seam",
);
assert.ok(
  !/rounded-t-2xl/.test(queuePanelCode),
  "Queued sheet must not draw a second radius over the composer",
);
assert.ok(
  !/bg-surface-raised/.test(queuePanelCode),
  "Queued banner must use a token every theme defines, not the undefined bg-surface-raised",
);
// File Explorer side pane: the Files tab is a new *member* of the existing tab union, not a second
// state owner and not a second editor. It hosts the shared workspace file tree and hands file
// selections to the existing scoped code-viewer tab, which stays read-only by default and exposes an
// opt-in in-place edit mode for full plain-text files. These invariants keep the new tab wired to the
// same owners (workspaceSidePane lifecycle, code-viewer preview, the single IFileService writer, the
// single draft store) instead of drifting into a parallel tree/editor/writer implementation.
const [sidePaneModel, sidePanePanel, sidePaneTrigger, enUs, zhCn] = await Promise.all([
  read("packages/ui/src/lib/workspaceSidePane.ts"),
  read("packages/ui/src/app-shell/AnimatedSidePanePanel.tsx"),
  read("packages/ui/src/app-shell/SidePaneTabTrigger.tsx"),
  read("packages/ui/src/i18n/locales/en-US.ts"),
  read("packages/ui/src/i18n/locales/zh-CN.ts"),
]);
assert.ok(
  /export interface FilesSidePaneTab \{[\s\S]*?type: "files";/.test(sidePaneModel),
  "Files tab must be a typed member of the side-pane tab union",
);
assert.ok(
  /WORKSPACE_GLOBAL_SIDE_PANE_TAB_TYPES = new Set<WorkspaceSidePaneTab\["type"\]>\(\[[\s\S]*?"files",/.test(
    sidePaneModel,
  ),
  "Files tab must be workspace-global so it is reused, not stacked per owner",
);
assert.ok(
  sidePaneModel.includes("export function openFilesSidePane("),
  "Files tab lifecycle must live in workspaceSidePane, the single side-pane owner",
);
const filesTabBranch = sidePanePanel.slice(
  sidePanePanel.indexOf(') : tab.type === "files" ? ('),
  sidePanePanel.indexOf(') : tab.type === "code-viewer" ? ('),
);
assert.ok(filesTabBranch.length > 0, "Files tab render branch must exist");
assert.ok(
  filesTabBranch.includes("<WorkspaceFileTree"),
  "Files tab must render the shared WorkspaceFileTree, not a second tree implementation",
);
assert.ok(
  filesTabBranch.includes("onOpenCodeViewer("),
  "File selection must hand off to the existing code-viewer tab, not a second viewer",
);
assert.ok(
  sidePanePanel.includes(') : tab.type === "code-viewer" ? ('),
  "code-viewer render branch must exist",
);
assert.ok(
  /tab\.type === "code-viewer" \? \([\s\S]*?<PreviewPane[\s\S]*?enableInlineEdit/.test(
    sidePanePanel,
  ),
  "In-place editing must be opt-in on the side-pane code-viewer PreviewPane",
);
assert.ok(
  sidePanePanel.split("enableInlineEdit").length - 1 === 1,
  "In-place editing must be enabled at exactly one PreviewPane host (the side-pane code-viewer tab)",
);
assert.ok(
  /tab\.type === "code-viewer" \? \([\s\S]*?draftKey=\{tab\.sourceKey \?\? tab\.id\}/.test(
    sidePanePanel,
  ),
  "The editable code-viewer tab must key its draft by the stable code-viewer source identity",
);
// One draft owner: the module-level store keyed by the existing code-viewer source identity.
const draftStore = await read("packages/ui/src/lib/codeViewerEditDraftStore.ts");
assert.ok(
  draftStore.includes("codeViewerEditDraftStore") &&
    draftStore.includes("dirtyKeys") &&
    draftStore.includes("clearMany"),
  "Unsaved inline-edit drafts must have exactly one module-level owner with dirtyKeys/clearMany",
);
// One writer path: the in-pane editor saves through the existing IFileService contract.
const fileContract = await read("packages/services/src/file/file.ts");
const fileServiceImpl = await read("packages/services/src/file/fileService.ts");
assert.ok(
  /writeTextFile\(params: \{ path: string; content: string \}\): Promise<void>/.test(fileContract),
  "Editing must save through a single IFileService.writeTextFile method",
);
assert.ok(
  /async writeTextFile\([\s\S]*?atomicWriteText\(params\.path, params\.content\)/.test(
    fileServiceImpl,
  ),
  "IFileService.writeTextFile must reuse the shared atomicWriteText writer, not a second write path",
);
// No silent draft loss: every side-pane close path consults the draft owner before discarding.
const appPanels = await read("packages/ui/src/hooks/useAppPanels.ts");
assert.ok(
  /confirmDiscardCodeViewerDrafts[\s\S]*?codeViewerEditDraftStore\.isDirty\(key\)[\s\S]*?requestConfirmation\(/.test(
    appPanels,
  ),
  "A dirty inline-edit draft must be confirmed before any close path discards it",
);
assert.ok(
  appPanels.includes("const confirmDiscardCodeViewerDrafts = useCallback("),
  "The unsaved-draft guard must be a single shared helper, not duplicated per close path",
);
assert.ok(
  appPanels.split("confirmDiscardCodeViewerDrafts(").length - 1 === 3,
  "handleCloseSidePaneTab / close-others / close-all must all route through the discard guard",
);
// The guard must key drafts exactly like the editor (`sourceKey ?? id`), otherwise a dirty draft
// with a null sourceKey could be closed without confirmation.
assert.ok(
  /\.map\(\(tab\) => tab\.sourceKey \?\? tab\.id\)/.test(appPanels),
  "The discard guard must derive draft keys exactly like the editor (sourceKey ?? tab.id)",
);
// The confirmation must come BEFORE side-chat teardown / main browser authority, so a cancelled
// close does not leave those already torn down for a tab that stays open.
assert.ok(
  /void confirmDiscardCodeViewerDrafts\(closingTabs\)\.then\(async \(draftsAuthorized\) => \{\s*if \(!draftsAuthorized\) return;\s*if \(closingTab\?\.type === "selection-side-chat"\)[\s\S]*?await closeBrowserTabsWithAuthority\(closingTabs\)/.test(
    appPanels,
  ),
  "The discard confirmation must precede side-chat teardown and the main browser close authority",
);
assert.ok(
  /tab\.type === "files"\) \{\s*return <FolderTreeIcon/.test(sidePaneTrigger),
  "Files tab icon branch must precede the tab.source fallthrough that would crash on undefined",
);
assert.ok(
  enUs.includes('"sidePane.files": "Files"'),
  "Files tab label must exist in the English catalog",
);
assert.ok(
  zhCn.includes('"sidePane.files": "文件"'),
  "Files tab label must exist in the translated catalog",
);
const editors = await read("packages/desktop/src/main/editors.ts");
// Main-side editor display names are rendered verbatim by the UI and never pass through a locale
// catalogue, so they must already be English. A localized value leaks the source language into the
// English-only menu. Legacy Chinese comments in this file are fine; only `name` literals matter.
assert.ok(
  !/name: "[^"]*[\u3400-\u9fff]/.test(editors),
  "Desktop editor display names must not contain CJK; the UI renders these names verbatim",
);
assert.ok(
  editors.includes('name: "File Explorer"'),
  "The Windows file manager entry must be named in English (File Explorer)",
);
const about = await read("packages/desktop/src/main/about.ts");
// The About dialog is a product surface. Its locale branch is reachable (system language), but the
// product UI is English-only, so every locale value must already be English.
assert.ok(
  !/aboutTitle: "[^"]*[\u3400-\u9fff]/.test(about),
  "About dialog title must be English on every locale",
);
assert.ok(
  !/copyright: \(year\) => `[^`]*[\u3400-\u9fff]/.test(about),
  "About copyright line must be English on every locale",
);
// Quiet Studio is English-only. `currentApplicationLocale` is the single owner of the Main-side
// presentation locale and feeds every native / non-React surface (application menu, text context
// menu, tray, auto-update status, About / quit / external-workspace / force-update / architecture
// dialogs, the embedded-browser JS dialog and the standalone CUA permission drag panel). The stored
// value stays compatible, so the guard is a single presentation collapse at each write path plus the
// menu-label helper. An unguarded write would silently regress English back to the system language.
const applicationMenu = await read("packages/desktop/src/main/desktopApplicationMenu.ts");
assert.ok(
  /export function resolvePresentationLocale\(locale: Locale\): Locale \{\s*return locale === "zh-CN" \? "en-US" : locale;/.test(
    applicationMenu,
  ),
  "Presentation locale must collapse zh-CN to en-US",
);
assert.ok(
  applicationMenu.includes("getDesktopMenuMessage(resolvePresentationLocale(locale), id)"),
  "Native menu labels must be resolved through resolvePresentationLocale",
);
const mainIndex = await read("packages/desktop/src/main/index.ts");
const applicationLocaleWrites = [...mainIndex.matchAll(/currentApplicationLocale = ([^;]+);/g)].map(
  ([, rightHandSide]) => rightHandSide,
);
assert.ok(
  applicationLocaleWrites.length >= 3,
  "Expected the bootstrap, system-language and IPC writes of currentApplicationLocale",
);
assert.ok(
  applicationLocaleWrites.every((rightHandSide) =>
    rightHandSide.includes("resolvePresentationLocale("),
  ),
  "Every currentApplicationLocale write must pass through resolvePresentationLocale",
);
assert.ok(
  /resolvePresentationLocale\(\s*currentApplicationLocale === DEFAULT_LOCALE/.test(mainIndex),
  "The early deep-link confirmation fallback must also pass through resolvePresentationLocale",
);
const errorBoundary = await read("packages/ui/src/ErrorBoundary.tsx");
assert.ok(
  !/i18n\/locales\/zh-CN\.js/.test(errorBoundary),
  "The crash fallback must not import the Chinese catalogue",
);
assert.ok(
  errorBoundary.includes("return enUS[id] ?? id;"),
  "The crash fallback must resolve messages from the en-US catalogue only",
);
assert.ok(!/handleOpenModelUpgrade|handleOpenQuotaUpgrade|upgradeActionLabelId/.test(sessionPane));
assert.ok(
  english.includes(
    '"chat.error.noAvailableModel": "No model available. Set a custom model to get started."',
  ),
);
assert.ok(chinese.includes('"chat.error.noAvailableModel":'));
assert.ok(
  !/\bUpgrade\b/.test(english.match(/"chat\.error\.noAvailableModel": "([^"]+)"/)?.[1] ?? ""),
);
console.info(
  "Quiet Studio surface, conversation, ownership, navigation, mobile and isolation source checks passed.",
);
