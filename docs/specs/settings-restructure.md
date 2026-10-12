# Settings Restructure

**Status:** active specification; partial implementation  
**Owner:** shared UI Settings maintainers  
**Authority:** product contract and acceptance scenarios  
**Scope:** Settings navigation, section placement, and General layout  
**Updated:** 2026-10-12 08:31 (local time)  
**Verification:** source review only; no runtime verification in this update

The rules and acceptance scenarios below remain the intended contract. Current source does not
satisfy all of them; the implementation gaps are recorded separately rather than redefined as
accepted behavior.

## Goal

Reduce Settings to a small, predictable surface. Settings must be quick to scan and
quick to understand: fewer sections, merged duplicates, plain-language copy, and a
minimal layout that uses section headings and thin dividers instead of a stack of
bordered cards. Anything niche, redundant, or platform-specific that only a few users
need is removed or folded into the settings it belongs with.

## Product rules

1. **Three sidebar groups, one flat list.** The sidebar shows three groups —
   General, Agent, and Data — and nothing else. Group titles are short
   (`settings.sidebar.group.general` / `.agent` / `.data`) and always visible:
   hiding them at narrow widths removes the sidebar's structure, so titles and
   section names must render at every window width. The navigation keeps one
   fixed readable column: it does not shrink into an icon-only rail, long labels
   truncate instead of disappearing, and the bottom Settings-only footer stays
   visible at every width.
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
7. **Merged rows.** `messageStreamShowReasoning` and `messageStreamShowTodos` are grouped;
   `toolGroupingExplore` / `toolGroupingTerminal` / `toolGroupingChanges` are grouped;
   HTTP proxy keeps a single row with an advanced section. The former General notification rows
   (`notification`/`notificationSound`) are superseded by a dedicated **Notifications** section
   ([`notification-settings.md`](notification-settings.md)); General no longer carries them.
8. **No dead identifiers.** Removed sections drop their i18n keys, tests, and
   navigation entries in the same change. Legacy persisted ids migrate instead of
   being re-rendered.
9. **Platform-gated sections.** A section whose settings only apply on one platform is
   listed only there. `network` is desktop-only: the local-network listener runs in the
   desktop window Host, so the browser view (which that listener serves) never lists it
   and cannot enable a second listener. The shared, platform-free `SETTINGS_SECTIONS`
   export represents the web view and excludes it.

## State owner

- `packages/ui/src/lib/settingsNavigation.ts` owns `SettingsSectionId`, the hidden-section
  set, legacy-id migration, and the pending-intent sessionStorage contract.
- `packages/ui/src/settings/settingsPageConfig.ts` owns section definitions, sidebar
  groups, icons, and titles.
- `packages/ui/src/SettingsPage.tsx` owns section rendering and the settings shell grid.
  It lays out its own two columns (nav, content) and must not reserve a workspace-sidebar
  column: while Settings is active the workspace shell is transparent, so a reserved
  column renders as an empty band that pushes the nav into the middle of the window.
- `packages/ui/src/settings/SettingsPageParts.tsx` owns the shared row/section/list
  primitives used by every settings page.

Every consumer reads the section list from `settingsPageConfig`; none defines its own.

## Probe effects

Settings probes (model discovery, coding-plan entitlements) must key their effects on
stable content identifiers, not on object or callback identity. A probe whose dependency
array holds a recreated view object or a `useCallback` that itself depends on recreated
values will re-run on every render, and because a probe typically issues RPC calls each
pass, the result is a request storm rather than a single read.

Rules:

- Depend on a content key (a revision, or a joined id list), never on an object identity.
- Read callbacks that are recreated upstream through a ref.
- A re-render caused by the probe's own state update must not restart the probe.

## Interface

```ts
export type SettingsSectionId =
  | "general"
  | "appearance"
  | "notifications"
  | "sound"
  | "modelProvider"
  | "memory"
  | "soul"
  | "extensions"
  | "usage"
  | "dataLocation"
  | "network"
  | "subagents"
  | "hooks"
  | "automations"
  | "shortcuts";
```

Legacy ids resolve as follows: `plugins | plugin | mcp | skill | skills | commands` →
`extensions` (carrying the matching plugin sub-tab when present); `migration | browser |
computerUse | workspaceFileSearch` → `general`; `codePreview` → `appearance`.

`automations` remains a recognized compatibility identifier and render branch, but
`HIDDEN_SETTINGS_SECTIONS` excludes it from Settings navigation and resolves it to the fallback
section. Automations belongs to the workspace main view, not the Settings sidebar.

## Current-source gaps

Source review on 2026-10-12 found these differences from the contract:

- [`SettingsPage.tsx`](../../packages/ui/src/SettingsPage.tsx) still renders `MigrationSection`
  inside General. Removing its top-level navigation identifier did not remove its content.
- [`settingsPageHelpers.tsx`](../../packages/ui/src/settingsPageHelpers.tsx) still renders the
  `dataBaseDir` row in General. `dataLocation` exists in the navigation union and section config,
  but `SettingsPage.tsx` has no `dataLocation` content branch.
- General still contains `desktopChromiumHardwareAcceleration`, `receivePreviewUpdates`,
  `closeToTrayOnWindows`, `httpProxyCaCertPath`, `terminalFontFamily`, and `modelIoFullRetention`
  rows. Its inlined [`BrowserSettingsSection.tsx`](../../packages/ui/src/settings/BrowserSettingsSection.tsx)
  still contains the browser import action and `embeddedBrowserAllowInsecureCertificates` control,
  subject to their existing platform/capability gates. These are not completed removals.
- General still uses multiple `SettingsGroupCard` wrappers rather than the intended headings and
  thin-divider layout.
- Notifications and Sound do have dedicated navigation entries and render branches. The former
  General notification rows are no longer rendered by `GeneralSectionContent`.

These observations are source evidence, not proof of usable navigation or a successful runtime
interaction. No implementation change is part of this documentation update.

### Unresolved Settings runtime error

The reported Settings error `1 is not a function` remains **unresolved**. A successful static
typecheck, the existence of an event handler, or the absence of a literal `1(` in source cannot
disprove a runtime call error. None establishes HMR as the cause. Diagnosis still requires the
failing interaction, runtime stack trace, and loaded-build context; no reproduction or resolution
is claimed here.

## Acceptance scenarios

1. The Settings sidebar lists General, Appearance, Notifications, Sound, Shortcuts, Model Providers,
   Memory, Soul, Subagents, Extensions, Hooks, Usage, and Data Location — grouped as General,
   Agent, Data. On desktop it also lists Network in the Data group; on web the Network
   section is absent. Both the group titles and the section names stay visible at every
   window width; they must not be visually hidden at narrow widths. The navigation keeps
   one fixed-width column and never collapses into an icon-only rail; long labels
   truncate with an ellipsis and the bottom Settings-only footer stays visible. The
   sidebar renders as a fixed column at the left edge of the settings page, with no
   reserved blank column — the settings page does not lay out a workspace-sidebar column,
   because the workspace shell is transparent while Settings is active.
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
9. Opening a settings view that probes a provider issues one request per probe, not one
   per render; repeated credential or entitlement reads while the panel is idle are a bug.
10. Network appears in the Data group on desktop and is absent on web. The section is a
    recognised `SettingsSectionId`, and the platform-free `SETTINGS_SECTIONS` export does
    not list it. Its behavior is owned by
    [`local-network-access.md`](local-network-access.md).
