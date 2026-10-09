# Settings Restructure

Status: Implemented

## Goal

Reduce Settings to a small, predictable surface. Settings must be quick to scan and
quick to understand: fewer sections, merged duplicates, plain-language copy, and a
minimal layout that uses section headings and thin dividers instead of a stack of
bordered cards. Anything niche, redundant, or platform-specific that only a few users
need is removed or folded into the settings it belongs with.

## Product rules

1. **Three sidebar groups, one flat list.** The sidebar shows three groups —
   General, Agent, and Data — and nothing else. Group titles are short
   (`settings.sidebar.group.general` / `.agent` / `.data`).
2. **Merged sections.** Plugin, MCP, Skill, and Command management are one section,
   `extensions`, with sub-tabs (`plugins`, `mcps`, `skills`, `commands`). The separate
   `plugin`, `mcp`, `skill`, `commands`, and legacy `plugins` sections no longer exist.
3. **Inlined sections.** Browser control, Computer Use, and workspace file search are
   no longer top-level sections. Their settings render inside General, grouped under
   their own headings.
4. **Removed sections.** `migration` is removed from Settings.
5. **Data location moved.** The data directory control moves out of General into its
   own Data-group section, `dataLocation`.
6. **Removed rows.** These rows are gone from General: `desktopChromiumHardwareAcceleration`,
   `receivePreviewUpdates`, `closeToTrayOnWindows`, `httpProxyCaCertPath`, `terminalFontFamily`,
   `modelIoFullRetention`, the browser `import` action, and
   `embeddedBrowserAllowInsecureCertificates`. Behaviors that were always-on defaults keep
   their defaults.
7. **Merged rows.** `notification` and `notificationSound` are one row group;
   `messageStreamShowReasoning` and `messageStreamShowTodos` are grouped;
   `toolGroupingExplore` / `toolGroupingTerminal` / `toolGroupingChanges` are grouped;
   HTTP proxy keeps a single row with an advanced section.
8. **No dead identifiers.** Removed sections drop their i18n keys, tests, and
   navigation entries in the same change. Legacy persisted ids migrate instead of
   being re-rendered.

## State owner

- `packages/ui/src/lib/settingsNavigation.ts` owns `SettingsSectionId`, the hidden-section
  set, legacy-id migration, and the pending-intent sessionStorage contract.
- `packages/ui/src/settings/settingsPageConfig.ts` owns section definitions, sidebar
  groups, icons, and titles.
- `packages/ui/src/SettingsPage.tsx` owns section rendering.
- `packages/ui/src/settings/SettingsPageParts.tsx` owns the shared row/section/list
  primitives used by every settings page.

Every consumer reads the section list from `settingsPageConfig`; none defines its own.

## Interface

```ts
export type SettingsSectionId =
  | "general"
  | "appearance"
  | "modelProvider"
  | "memory"
  | "soul"
  | "extensions"
  | "usage"
  | "dataLocation"
  | "subagents"
  | "hooks"
  | "automations"
  | "shortcuts";
```

Legacy ids resolve as follows: `plugins | plugin | mcp | skill | skills | commands` →
`extensions` (carrying the matching plugin sub-tab when present); `migration | browser |
computerUse | workspaceFileSearch` → `general`; `codePreview` → `appearance`.

## Acceptance scenarios

1. The Settings sidebar lists General, Appearance, Shortcuts, Model Providers, Memory,
   Soul, Subagents, Extensions, Hooks, Usage, and Data Location — grouped as General,
   Agent, Data.
2. Opening Extensions shows four sub-tabs: Plugins, MCPs, Skills, Commands.
3. A persisted `skill` (or any legacy plugin-family id) opens Extensions on the matching
   sub-tab and rewrites the stored id to `extensions`.
4. Browser / Computer Use / workspace file search settings are reachable inside General.
5. Migration is not present anywhere in Settings.
6. The removed rows do not appear in General, and no i18n key for them remains.
7. General renders as grouped rows with section headings and thin dividers, not as a
   masonry of bordered cards.
8. Every sidebar group and section title resolves to user-facing text in each maintained
   locale catalog. A missing catalog entry must fail regression coverage rather than
   rendering its raw message identifier in the sidebar.
