# Quiet Studio: first-stage presentation

**Status:** active specification  
**Owner:** Quiet Studio UI and platform maintainers  
**Authority:** product contract and acceptance scenarios  
**Scope:** Stage 1 shell, sidebar, chat, task-list presentation, and Appearance  
**Updated:** 2026-10-09 16:31 (local time)  
**Verification:** requirements and source alignment; runtime verification is tracked separately in [`../verification-log.md`](../verification-log.md)

This document defines intended behavior. It does not by itself prove implementation, runtime smoothness, packaging, or installer behavior. Read [`../README.md`](../README.md), [`../quiet-studio/architecture-and-scope.md`](../quiet-studio/architecture-and-scope.md), and [`../../DESIGN.md`](../../DESIGN.md) for routing and ownership.

## Product rules

Mesa Code keeps its actual backend, commands, workspaces, tools, settings, and agent runtime. Quiet Studio changes only the shared shell, sidebar, conversation, and Appearance presentation. The HTML concept is a visual reference, never a runtime or source of fake conversations. Plugin/catalog pages and protocol behavior are out of scope.

The checked-out theme catalog is System, Zai Light, Zai Dark, Black, Midnight, Ocean, Forest, Purple, Rose, and Amber — all ten are selectable. Every theme defines a full surface token set. Independent accent selection uses six renamed options: Jade (default), Sky, Violet, Rose, Amber, Coral. Dark surfaces use muted studio green, light surfaces warm paper, Black remains black, and each catalogue theme has its own tinted surface palette. A density preference (comfortable / compact) adjusts interface spacing.

Desktop navigation uses one sidebar, without a parallel icon rail. One Mesa Code identity heads the sidebar; New task is the primary action, followed by one Search action and one Automations action. A single Settings action occupies the footer, with Appearance available through Settings rather than another navigation button. The outermost desktop/web shell paints one semantic border around the full window surface; internal panel borders remain separate layout dividers. Group/Project grouping, filters, history navigation, and workspace content retain their existing handlers. Sidebar content stays available, resizable, keyboard accessible, and workspace scoped. Existing collapse and small-screen sidebar controls remain available; collapsed navigation must not show a second copy beside the expanded sidebar. Conversation scrolling, virtualization, composition, attachment handling, and keyboard submission remain unchanged. Presentation hooks must not change measured row heights after layout or impose a second scroll container.

## Shared sidebar presentation

Workspace is the visual reference for Workspace and Settings sidebars: use the same sidebar surface, right divider, 48px header band, 8px horizontal inset, rounded-lg rows, and existing bottom Settings-only footer. Settings retains its Back action and section menu; Windows Settings displays the Mesa Code identity alongside its logo. Both surfaces use one `quiet-studio-nav-selected` style with accent background and an inset brand-colored left marker. New task remains a primary action, not a selection. Existing tab/session stores and Settings section state remain the owners; no new navigation state or persistence is introduced.

Acceptance scenarios:

1. Opening Settings preserves sidebar width and matches Workspace background, divider, row corners, and footer positioning across themes.
2. Selecting a task, archived task, Automations, or Settings section displays the same active marker. Existing navigation handlers, remote statuses, drag indicators, and keyboard focus remain intact.
3. Narrow Settings retains icon-only navigation; long labels truncate. Returning to Workspace preserves existing task selection and drafts. Runtime interaction checks are reported separately from source checks.
4. Task-list revalidation keeps the last committed workspace snapshot visible while activity, membership, or remote-session data refreshes. The empty state appears only after a confirmed empty result or first-load completion, never as a transient stale-cache frame.
5. Opening or streaming a task, creating/archiving/pinning it, and reconnecting a remote workspace preserve the visible task snapshot until the authoritative replacement arrives. Existing task-list stores and service subscriptions remain the owners; no polling, timer, persistence, or second cache is introduced.

## Conversation streaming work

Streaming must not materialize unchanged historical turns or preprocess response text for an empty find query or unavailable preview cards. The existing timeline-owned cache reuses turn derivation before materialization, keyed by ordered member-row identities, draft position, session phase, and elapsed time for running turns. Dropped turns are evicted; filtering and final position normalization remain authoritative. Cached and uncached derivation must agree through completion, paging, guide insertion, abnormal termination, invisible turns, and removal.

The composer reads a narrow snapshot projection: input routing, control, config, usage, accepted queue, background work, shared-context import, and total row count. Response-text-only updates do not change that projection. The existing composer still owns drafts; `ConversationProjectionStore` remains the sole accepted-state owner. Telemetry retains user-input notifications without rescanning unchanged text updates. No business-state cache, persistence, protocol, timer, parser replacement, or additional scroll owner is introduced.

```text
Desktop continuous / mobile replayable -> existing sequence-checked projection owner
  -> immutable row identities -> timeline-owned derived cache -> changed turn materialization
  -> composer field projection -> existing draft / routing / stop controls
  -> existing layout and scroll-follow owner -> viewport
```

Acceptance scenarios:

1. Cached derivation equals uncached output through streamed text/tool updates, time ticks, session-phase changes, history prepend, hidden turns, new turns, and row removal. Unchanged history skips materialization and retains identity when position is unchanged.
2. Empty find preserves loaded-row counts without text projection; nonempty find and highlights keep their current semantics. Preview cards still appear on complete/interrupted responses without joining text while unavailable.
3. Composer routing, stop state, usage, sharing, background work, and history availability remain live. Typing drafts and scrolling away from a streaming response do not lose content or scroll intent; returning to the bottom resumes follow behavior.
4. Synthetic timings use generated data only, report history sizes and before/after measurements, and are not presented as real-app frame rates. Runtime interaction checks and uncovered desktop/mobile paths are reported separately. Zero lag is not assumed from static tests.
5. Streaming loading indicators use lowercase DOM data attributes and emit no React unknown-property warnings. Existing loading state, accessibility, animation, and scroll ownership remain unchanged.

## Conversation change summary

`ConversationFileSummaryPanel` renders aggregate and per-file addition/deletion counts as compact separate badges using `bg-diff-added` / `text-diff-added-foreground` and `bg-diff-removed` / `text-diff-removed-foreground`. Keep explicit + and - signs, tabular numbers, and existing theme tokens; diff background colors must not be used as count text colors. Existing summary/details state and Review, Open, and Undo command paths remain the sole owners; no new state, protocol, persistence, or migration is introduced.

Acceptance scenarios:

1. Collapsed and expanded summaries show readable, distinct addition/deletion badges in light, dark, Black, and tinted themes, including zero aggregate counts.
2. Narrow layouts retain filename truncation and reachable Undo controls without changing keyboard expansion, file review, or rewind behavior.
3. Existing disabled/loading/reverted states remain unchanged. Visual runtime verification is separate from source regression checks.

## Product display name

User-facing application identity is exactly **Mesa Code**, including development window/application labels, taskbar labels, packaged executable metadata, installer product/shortcut/uninstall names, and installer copy. Quiet Studio is only the source presentation variant; Preview and Quiet Studio suffixes are not product names. Version/build status may remain separate metadata, not a replacement product name.

Desktop Main remains the owner of application/window naming; the existing packaging configuration remains the installer owner. Keep package scopes, environment variable names, app IDs, deep links, protocol, and storage identifiers unchanged. Project-local development data overrides remain isolated even though the displayed application name matches the original product. Do not install, replace another installation, or migrate data as part of this naming change.

Acceptance scenarios:

1. An isolated development launch reports application name Mesa Code and displays Mesa Code rather than Mesa Code Preview/Quiet Studio in product labels.
2. Packaged installer metadata and installed shortcut/uninstall display names use Mesa Code. Preserve versioned artifact naming and existing application identity/data compatibility.
3. Naming checks leave runtime directories, user data, protocol/storage keys, and internal package identifiers unchanged; installer build/launch/install verification are reported separately.

## User-facing UI language

Every user-visible string that Quiet Studio renders is English. The renderer already resolves `zh-CN` and `en-US` to the same `en-US` catalogue, so translated UI text is presentation and must stay English. Presentation-layer labels that are not translated catalogue entries — using a display name that comes from Desktop Main or another injected source — are held to the same rule, because the presentation layer renders them verbatim and cannot translate them.

Display names that cross the Main/UI boundary (for example an installed editor's menu label) are English in the Main-side definition. A localized value such as `资源管理器` leaks the source language straight into an English-only menu because no catalogue lookup happens on the render path. English values match the existing catalogue wording and the macOS counterpart (`Finder`).

English is the rule for product UI only. User data, workspace paths, and existing stable protocol/storage identifiers are never rewritten.

The application locale is a single owner maintained by Desktop Main (`currentApplicationLocale`, resolved from the persisted setting or the system preferred language). Native and non-React surfaces that build their copy from a locale catalogue never render Chinese for user-facing text in Quiet Studio: the native application menu and its text context menu, the tray, menu-bound auto-update status, the About dialog, the standalone CUA permission drag panel, the embedded-browser alert/confirm button labels, and shell dialogs (quit confirmation, external-workspace confirmation, force-update, architecture mismatch) all resolve to English. The locale may still be read from the platform, but Quiet Studio maps any `zh-CN` selection to `en-US` before it reaches user-visible copy, so a Chinese-language OS cannot leak Chinese into the product UI. The legacy locale value stays readable and writable for protocol compatibility; this changes presentation only, not stored identity, protocol shape, or user data.

Acceptance scenarios:

1. The "Open in Editor" list names each entry in English; the Windows file-manager entry reads `File Explorer`, not `资源管理器`, and matches the macOS `Finder` precedent.
2. No presentation surface renders a source-language label produced by a Main-side display name; such definitions are authored in English at the point of definition.
3. The native application menu, text context menu, tray, and auto-update menu labels render in English even when the OS preferred language is Chinese.
4. The About dialog, quit-confirmation dialog, external-workspace confirmation, force-update prompt, and architecture-mismatch prompt render in English on a Chinese-language OS.
5. The standalone CUA permission drag panel renders in English on a Chinese-language OS; it must not fall back to the Chinese catalogue.

## Owners and interface

- Theme, accent, density, and interface font size: existing Mesa Code Zustand store and its preference setters. Appearance reads those fields; it does not create another store.
- Sidebar visibility, width, navigation and file tree: existing WorkspaceShellLayout, tab store, and WorkspaceSidebar handlers.
- Uncommitted text and optimistic overlay: existing conversation composer/session store.
- Accepted input, queue and run state: CommandInbox and Host owner/lease, never sidebar presentation or renderer.
- Native operations: injected platform service; no direct window bridge.

```text
Appearance input
  => existing preference setter => persistence + guarded broadcast
  => existing theme/accent application => CSS semantic tokens

Sidebar input => existing sidebar handler => existing tab/command owner => UI projection
Composer input => existing command admission => Host owner/lease => CommandInbox
  => runtime state => existing conversation events => timeline projection

desktop-continuous: direct live stream => same owner and sequence
web-remote-replayable: snapshot + gap repair => same owner and sequence
```

No new network calls, timeouts, routing paths, business data writes, idempotency keys, or async owners. Existing workspace identity/local-path fallback, remote session correlation, stale-run guards, and broadcast feedback safeguards remain intact. Failure messages and disabled/read-only states stay owned by existing components.

## Appearance layout and theme application

Appearance groups app theme, accent, interface font size, and density in a padded card, separate from code settings and code previews. Controls use consistent widths and wrap below their labels on narrow screens. The live app preview represents the current single-sidebar layout, not a removed navigation rail. Existing localized labels and controls remain; no preference or setting is removed.

All ten catalog selections must apply distinct semantic surface palettes immediately and retain the selected value after reload. System follows OS light/dark changes. Legacy `light` and `dark` normalize to Zai Light/Zai Dark, but Midnight, Ocean, Forest, Purple, Rose, and Amber must not silently normalize to Zai Dark. Existing Zustand setters, persistence, and guarded broadcasts remain the sole preference write path; this change adds no store, migration, or server write path. Accent stays independent; code themes and terminal/font ownership remain unchanged.

Acceptance scenarios:

1. Select each catalog theme in actual Appearance: its root theme class and background/sidebar/card/input colors agree, without changing the chosen accent.
2. Reload after each selection: selected theme and surface palette remain. System responds to OS color-scheme changes; legacy aliases remain compatible.
3. App and code settings have padded readable rows, aligned controls, and no horizontal overflow at narrow widths. Preview shows one sidebar.
4. Code themes, interface font size, density, and accent retain their existing handlers and persistence rules.

## Adaptive code colors

Code settings offer an explicit Follow app theme choice for each light/dark code preference, alongside curated built-in syntax themes. Adaptive code colors use the existing app surface and foreground palette and the selected accent for selected syntax roles, while keeping keywords, strings, numbers, and comments distinguishable. All ten app themes and all six accents are supported. Light and dark previews show their respective surface modes; the active preview matches the current app theme. Manual built-in themes retain their original palette and do not silently become adaptive.

The existing code-preview preference store owns the choice and local persistence. Theme/accent continue through their existing guarded broadcast path; code settings do not gain a new broadcast contract. Theme/accent changes derive rendering colors without adding preference writes, a competing store, or new network calls. Existing saved manual themes remain unchanged; invalid inputs retain the current normalization fallback. Code text, line numbers, wrapping, independent code font sizes, and diff semantics remain unchanged.

```text
Code preference action => existing setter => local persistence
App theme / accent action => existing appearance owner => derived syntax palette
Derived palette => existing highlighter/code renderers => live code and preview
```

Acceptance scenarios:

1. Select Follow app theme in light/dark code settings: code colors respond immediately to every app theme and accent, including System mode changes.
2. Manual syntax selections still render and persist across reload without modifying app theme/accent.
3. Adaptive token foreground colors remain legible against each background; comments, keywords, strings, and numbers are distinct. Diff added/removed meaning is preserved.
4. Existing code/font/wrap/line-number preferences remain compatible, and unsupported language handling still uses the existing plain-text fallback.

## Conversation landing polish

The draft landing view shows only the localized time-based greeting, without a decorative background logo. Keep its existing responsive font measurement and greeting boundary timer. Use a compact bottom margin and the existing centered composer width; no new scroll container or state owner.

Missing-model and quota banners do not offer an Upgrade action. The missing-model banner retains the existing model-settings command and dismiss action, with copy directing users to configure a custom model. Quota warning messages, severity, dismissal rules, billing settings elsewhere, and backend entitlement checks remain unchanged. Banner text wraps at narrow widths rather than hiding the recovery instruction.

The draft composer uses one surface and one visible border, including one keyboard-focus outline. The editor does not draw an additional nested frame. Project selection joins the existing bottom toolbar beside attachments and permission controls rather than occupying a separate header. The toolbar wraps at narrow widths; model selection and send controls remain available, with their existing disabled and read-only rules. The greeting and composer retain their centered widths.

Missing-model guidance is a lightweight, borderless supporting row below the draft composer, using muted text and the existing model-settings and dismissal controls. Other errors retain their diagnostic banner and actions above the composer. Do not hide recovery instructions or change error classification.

`SessionPane` continues to own settings navigation and error dismissal; the composer forwards those commands to `ChatErrorBanner`. The editor retains draft and submission ownership. These presentation changes introduce no replacement command, network request, persistence path, or migration. Existing draft, runtime, quota, and remote delivery owners stay unchanged.

Acceptance scenarios:

1. A new draft displays the greeting without a background logo, stays centered with its composer, and fits desktop and mobile widths.
2. A missing-model error displays the localized configuration instruction, Set, and dismiss controls, with no Upgrade control. Set opens the existing model settings; dismiss clears the existing error.
3. Quota warnings retain their message and applicable dismiss action, with no Upgrade control. Sending, attachments, keyboard submission, and quota enforcement are unchanged.
4. Existing diagnostic actions for other errors remain available. Long error messages remain readable without horizontal overflow.
5. A draft shows one composer frame; focusing the editor shows one focus outline. Project selection, attachments, permission, model selection, and send remain reachable by keyboard in the bottom toolbar.
6. At desktop and mobile widths, missing-model guidance appears below the draft composer without a filled card; its setup and dismissal actions still work. Toolbar wrapping does not create horizontal overflow or change attachment, project-selection, or submission behavior.

### Runnable interaction check

With the isolated desktop dev server running and current Main/Host/preload artifacts ready, run `node scripts/quiet-studio-composer-e2e.mjs`. It launches a separate Electron instance with data under `.quiet-studio-runtime/composer-e2e`, never submits input, and checks typing, project/menu access, draft preservation, single-frame layout, toolbar fit at 672px and 340px composer widths, missing-model guidance placement/dismissal, and that the sidebar has no rail, one New task, one Settings, and a bottom footer. The same check selects all ten themes through Appearance, verifies distinct surface tokens and unchanged accent, reloads each selection, checks System against light/dark media changes, and captures the padded Appearance layout. Screenshots stay inside that test directory. Narrow component coverage is not a full mobile-web, multi-window broadcast, or remote-delivery test.

## Queued follow-up panel

When the runtime is busy, accepted follow-up input is admitted to the queue and shown above the composer as a queued sheet. The sheet and the composer are one continuous surface: the sheet shares the composer's border token and fill, keeps only its top corners rounded at the composer's radius, and drops its bottom border where the composer's top edge continues the outline. The sheet must not paint a second full frame with its own radius or fill; because the composer is painted after the sheet, a second frame would expose a doubled outline with mismatched radii at the seam.

Queued rows step down one radius level from the sheet and keep one action hierarchy: a compact secondary send/steer action plus ghost icon actions. The paused banner uses a defined raised-surface token that exists in every theme; a token that no theme defines leaves the banner unfilled.

This is presentation only. Queue admission and order, the drag boundary used for reordering, `projectPendingGuideQueue` sorting, delete/edit/steer commands and their telemetry, the `TID_V4_QUEUE*` hooks, and all theme/accent tokens remain unchanged. No new state owner, command, persistence, or network path is introduced.

Acceptance scenarios:

1. With queued items, the sheet and the composer read as one surface: a single continuous outline with one radius at the seam, no doubled or crooked frame, in every supported theme and accent.
2. Rows step down one radius level from the sheet and expose one compact secondary action plus ghost icon actions; the drag handle, delete, edit, and steer controls stay reachable and keep their existing disabled rules.
3. A paused queue shows a filled banner (not a transparent one) with its Continue action.
4. Reordering, deleting, editing, and steering queued items produce the same commands, order, and telemetry as before, and the `TID_V4_QUEUE*` hooks are unchanged.

## File Explorer side pane

The right side pane offers a Files tab so a connected workspace can be browsed without leaving the current conversation. The tab reuses the existing workspace file tree: it lists the folders and files of the connected workspace, and clicking a file opens a separate, closable code-viewer tab in the same pane. A plain-text file opened this way can be edited in place: the viewer stays read-only by default and offers an explicit edit mode for that file. Quiet Studio keeps the existing read-only `@pierre/diffs` viewer and adds no editor dependency; editing uses a plain monospace surface, so there is no syntax highlight while editing.

The Files tab is a new member of the existing side-pane tab union, not a new state owner. Tab lifecycle — opening, activating, closing, per-workspace memory, and persistence normalization — stays owned by the existing `useAppPanels` hook and `workspaceSidePane` module, exactly as the terminal and code-viewer tabs are today. The tree keeps using the same workspace identity/local-path fallback and the same `IFileService` read path as the left sidebar tree; it must not introduce a second file-reading path, a second workspace-binding key, or any create/rename/delete/copy operation.

Opening a file from the tree opens (or focuses) a code-viewer tab scoped to the same workspace identity, so the viewer resolves source through the existing scoped-source contract. A file is editable only when the existing reader returns it in full as plain text — editable does not include binary, truncated/too-large, image, media, PDF, PPTX, or Office files. Editing is opt-in per opened file: the read-only view remains the default, and typing starts only after the user enters edit mode.

Edits are a local draft owned by one module-level draft store keyed by the existing code-viewer source identity, so a draft survives tab re-activation and workspace/session switch until it is saved, reverted, or explicitly discarded. Saving writes the draft through the existing `IFileService` writer, which writes via the same atomic temp-file + rename path (cross-process lock and retry) used by other file writers; no second writer path is introduced and no protocol/storage identifier changes. Unsaved edits are never discarded silently: closing a tab (or closing other/all tabs) with a dirty draft asks for confirmation first, and a cancelled confirmation leaves the draft and the tab intact. Collapsing the pane or switching workspace/session does not lose a draft, because the draft lives in the store rather than the closed surface.

```text
Files tab open/activate/close => existing useAppPanels tab owner => existing side-pane state
Tree row select => existing IFileService read => code-viewer tab => PreviewPane (read-only by default)
PreviewPane edit mode => codeViewerEditDraftStore (single draft owner) => Save => IFileService.writeTextFile => atomicWriteText
Close tab with dirty draft => existing useConfirmDialog => discard (clear draft) or abort
Workspace identity => workspaceIdentity?.trim() || workspacePath => tree scope (unchanged)
```

No new network calls, timeouts, business-data writes beyond the explicit file save, idempotency keys, or asynchronous owners are introduced. Queue/run state, conversation admission, theme/accent tokens, and the mobile remote-control path are unaffected.

Acceptance scenarios:

1. With a workspace connected, the right side pane exposes a Files tab; opening it lists the connected workspace's folders and files.
2. Clicking a file in the Files tree opens its contents in a separate code-viewer tab in the same pane, read-only by default; clicking another file opens or focuses the existing viewer tab for that file/workspace instead of creating a duplicate tree tab.
3. A plain-text file can be edited in place: entering edit mode lets the user type, and the tab shows an unsaved-edits indicator while the draft differs from the file on disk.
4. Saving an edited file writes the draft through the existing `IFileService` writer and clears the unsaved-edits indicator; the on-disk file then matches the editor contents.
5. Closing a tab (or other/all tabs) while a draft is unsaved asks for confirmation; confirming discards the draft, cancelling keeps the tab and draft. Collapsing the pane or switching workspace/session keeps the draft. Binary, truncated/too-large, image, media, PDF, PPTX, and Office previews expose no edit mode.
6. The code-viewer tab is closable through the existing close control without affecting the conversation or the Files tab; the Files tab itself is closable and restorable through the existing open-tab launcher.
7. Browsing the Files tree and opening an editable file use the existing `IFileService` read path and the new single `IFileService` write method; no file is created, renamed, or deleted, and no second workspace-binding key is introduced.
8. The Files tree resolves remote versus local workspaces through the existing workspace identity/local-path fallback and remote session correlation; no path-only matching is added, and saving applies to the same remote host the file was read from.

## Assistant message actions

Chat does not expose like or dislike buttons. Copy and existing navigation actions remain available. Persisted feedback and its protocol remain compatible; removing the UI does not delete historical feedback. Acceptance: assistant message actions contain no like/dislike controls, including messages with existing feedback.

## Desktop window controls and tray

Desktop Main owns native window lifecycle. Maximize, restore, minimize, and interactive resize use Electron and the operating system's native transitions; interactive resize must not add per-frame React animation or persistence writes. Hide-to-tray transitions use a short opacity fade before the window is hidden, with reduced-motion and unavailable-tray paths skipping the fade.

General settings expose three desktop-only preferences: Enable tray, Close to tray, and Minimize to tray. The two child preferences are effective only while Enable tray is on; when tray is off, close exits through the existing quit policy and minimize remains a normal taskbar/dock minimize. When tray is on, Close to tray hides the window instead of closing it, while Minimize to tray hides it instead of minimizing it. Tray Quit always exits the application. Existing Windows close-to-tray data remains readable through the compatibility setting boundary.

Main keeps one tray lifecycle owner. Settings updates synchronously update the in-memory window policy and create/destroy the tray without duplicate instances. Renderer settings use the existing setting service and platform synchronization path; no second preference store or direct Electron bridge is introduced.

```text
Settings control -> settingService.update + syncAppSettings
                -> Main tray/window policy owner
                -> tray lifecycle + BrowserWindow close/minimize interception
                -> existing renderer window chrome state
```

Acceptance scenarios:

1. Desktop General settings show Enable tray, Close to tray, and Minimize to tray. Child controls are disabled or hidden when tray is disabled and persist through reload.
2. Tray disabled means no tray icon, normal close behavior, and normal taskbar/dock minimize.
3. Tray enabled + Close to tray hides the window; tray Show restores/focuses it; tray Quit exits. Tray enabled + Minimize to tray hides instead of minimizing.
4. Maximize/restore and interactive resize retain native behavior without per-frame React animation or visible layout lag. Hide-to-tray uses the bounded fade unless reduced motion is active.
5. Existing workspace/session state, explicit quit, update installation, multi-window handling, and platform-specific close policies remain unchanged.

## Settings navigation transitions

Settings reuses the workspace Settings-only footer at the bottom of its sidebar, outside the scrolling navigation, with the same padding and divider. The existing tab store owns navigation; animation owns only visual presence. Opening and closing use a 200ms ease-out opacity-only fade. No scaling, translation, layout animation, or blur is used, keeping text and sidebar geometry stable. No additional animation dependency or persistent compositor-layer allocation is introduced. Reduced-motion disables the transition. Exiting Settings immediately stops accepting input; reopening during exit must not create duplicate layers. Workspace remains mounted, preserving drafts and terminal state.

```text
Tab store commit -> Root visibility -> overlay presence -> exit removal
                                -> workspace interaction restored on close
```

Acceptance: the footer stays at the bottom while navigation scrolls; opening and closing both animate; rapid reopening leaves one interactive layer; reduced-motion finishes immediately. Runtime responsiveness must be measured rather than assumed.

## Window controls

Minimize, maximize/restore, and close are platform-native, so the window frame is never a second, divergent control surface. macOS keeps its native traffic lights. Windows desktop uses the OS caption buttons through `frame: true` plus `titleBarStyle: "hidden"` and `titleBarOverlay`, so the window buttons are drawn by the compositor and follow OS theme, hit testing, and snap layouts. Linux keeps the existing renderer-drawn controls, because its shell is frameless with Linux-specific rounded-corner styling and has no equivalent native overlay.

Desktop Main remains the single owner of window chrome. It reflects the resolved overlay theme and metrics (symbol color, overlay height, and the right safe-area padding that scales inversely with page zoom) onto the native overlay. The renderer does not draw window buttons on Windows; it reserves the native caption band on the right so the header action cluster and settings help control sit clear of the native buttons, and it keeps those regions non-draggable so a click is never swallowed by the drag region. Renderer-drawn controls remain on Linux only, gated by the same single flag used by the workspace header, the side pane, and Settings.

On Windows the right-side caption cells that sit next to the native buttons adopt the native caption appearance so the top bar reads as one band: full title-bar height, the same square geometry and equal width as an OS caption button, no rounding, and no extra gap between cells. This look is enabled for terminal, side-pane, share, and editor controls. The editor's open and selection buttons form one borderless 48px-high split cell in the fixed caption band, immediately before the terminal toggle. Its workspace identity and remote target remain unchanged. Acceptance: opening or closing the side pane does not move the editor control, no duplicate editor mount appears, and both editor actions remain available. It is presentation only: the icon, label, shortcut, and click behavior of each cell are unchanged, and the native buttons keep their own hit areas. The workspace help entry is removed from the conversation header; Settings keeps its own help control on non-Windows platforms only.

The same right-side cells are bound to the native band in position, not only in appearance: they sit flush against the first native button in the same top strip and the same title-bar height, with no empty stretch between the last renderer cell and the native buttons. Because the side pane is a collapsible surface, the cells must not be hosted inside any surface that the pane resizes: the conversation header is nested in the resizable conversation panel, so a cell hosted there would slide left for the duration of the pane-open animation and jump back as the pane closes. Instead the cells are one fixed overlay anchored to the window's right edge, independent of pane state, and the header and the side-pane strip reserve the same band width so their own content stops before the cells. Only the cells' selected/open styling changes with the pane; their place never does, and no cell is ever drawn twice. Only placement and caption appearance change: each cell keeps its existing owner, handler, label, and click behavior, and the side-pane toggle keeps its existing open/closed state.

This is presentation only. Window state, the maximize/restore broadcast, zoom persistence, drag regions, the window-chrome state contract, and the injected platform service that issues minimize/maximize/close commands all stay unchanged. No new window, protocol message, state owner, or storage key is introduced, and no platform identifier is renamed.

```text
Desktop Main => resolve overlay theme + metrics for zoom => native titleBarOverlay (Windows)
             => macOS traffic lights (unchanged) / Linux renderer controls (unchanged)
Renderer gate (Windows off) => header action cluster + settings help => reserve native caption band (no-drag)
Window-fixed caption band overlay => header + side-pane strip reserve band width (content stops before the cells) => flush against the native band
Renderer command => existing platform service => existing minimize/maximize/close owner
```

Acceptance scenarios:

1. On Windows, the three window buttons are OS-native: they minimize, maximize/restore, and close the window, and they follow the OS light/dark theme. No renderer-drawn window buttons are present.
2. The native caption band does not overlap the header action cluster, the settings help control, the breadcrumb, or any draggable region: a click on a renderer control opens that control rather than starting a window drag, and a click on a native button activates the native action.
3. At a non-default page zoom level, the native overlay height and the reserved right safe area stay in step with the renderer layout, with no gap or overlap between the right action cluster and the native buttons.
4. On Windows, the terminal toggle, side-pane toggle, and conversation-share cells render as caption cells (square, full title-bar height, equal width, no rounding, no trailing gap) so they read as one band with the native buttons; the editor button group keeps its own geometry. Icon, label, and click behavior are unchanged, and a differently sized cell never overlaps a native button or grows the band.
5. macOS traffic lights and Linux renderer controls keep their existing positions, hit areas, and behavior.
6. On Windows, the terminal toggle and side-pane toggle sit in one caption band pinned to the window's right edge, flush against the first native button at the same title-bar height with no empty stretch; the conversation header shows no help cell, and the header and side-pane strip reserve the band width so their content stops before the cells without ever drawing a second copy.
7. Opening or closing the side pane changes only the cells' selected/open styling: the terminal and side-pane toggle cells keep the same position throughout the pane-open and pane-close animation and do not slide, and the header's editor group does not move as a result of cells being re-hosted.

## Workspace surface framing

The workspace content surfaces read as clean panels, not as framed cards. The outer window chrome is owned by the OS on Windows and macOS; the renderer must not paint a second, decorative outline inside the window, because a hairline frame around every panel reads as clutter and does not match the borderless presentation of the shell.

On Windows the conversation panel, the terminal panel, and the side pane drop their decorative one-pixel `border-border` frame and their inner rounding. They keep the existing 4px panel inset so the OS owns the outer edge. Boundaries between genuinely distinct surfaces must remain visible: the header bottom divider, the sidebar right divider, the terminal divider, and the conversation-to-side-pane boundary. The side pane's resize handle is intentionally transparent (it only shows a grip on hover), so removing the decorative frame would otherwise let the conversation column and an open side pane merge into one surface; the conversation column therefore draws its own right divider while the pane is open, and only on Windows, so Linux and macOS (which keep their framed panel) never show a doubled line.

The conversation-to-side-pane divider is drawn on the whole conversation column, not on the conversation section, and spans its full height. The open terminal is docked as a sibling beneath the conversation section inside the same column, so a section-only right border would stop at the terminal's top edge and leave the docked bottom bar without a visible edge. Because the terminal is a full-width sibling of the side pane, the side pane occupies only the conversation row; the boundary alongside the terminal is the conversation column's edge, and the terminal carries its own top divider where it meets the conversation above it.

SettingsPage owns the outer content frame: Windows desktop has no decorative outer border, rounding, or top/right/bottom inset. The existing 48px title-bar drag area and native caption safe area remain; inner content/card padding and internal dividers are unchanged. Windows Settings omits both copies of WorkspaceHelpMenuButton beside the native caption buttons. Other platforms retain their existing inset, frame, help controls, and mobile layout. This uses the existing desktop platform flag, with no state, interface, failure handling, or migration changes.

Remove only the decorative frame. Presentation, layout, ownership, and behavior stay unchanged: the sidebar resize handle, the header divider, the terminal and side-pane dividers, the drag regions, window state, and the caption-band geometry are untouched. macOS and Linux keep their current framing, because macOS relies on native window rounding and Linux keeps its frameless shell with its own rounded-corner styling.

```text
Windows shell => panel inset (4px, unchanged) => keep; decorative border-border frame => remove
Windows divider (header bottom, sidebar right, terminal, conversation-to-side-pane) => keep
macOS / Linux frame => unchanged
```

Acceptance scenarios:

1. On Windows, the conversation panel, the terminal panel, and the side pane show no decorative one-pixel outline and no extra inner rounding; the panels read as borderless surfaces against the shell background.
2. On Windows, the header bottom divider, the sidebar right divider, the terminal divider, and the conversation-to-side-pane divider remain, so adjacent surfaces are still visually separated and no two regions merge; the conversation-to-side-pane divider spans the full conversation-column height, including alongside a docked terminal, appears while the side pane is open, and does not appear on Linux or macOS.
3. On Windows, the panel inset, the sidebar resize handle, the drag regions, the caption-band geometry, and the window state are unchanged from before the frame removal.
4. macOS and Linux framing, rounding, and hit areas are unchanged.
5. Windows desktop Settings reaches the top/right/bottom content edges without decorative inset, border, or rounding and shows no help button beside native minimize/maximize/close. Native controls, the 48px draggable header, caption safe area, cards, internal dividers, and navigation remain usable at default and non-default zoom. Other platforms and mobile retain their existing Settings frame, inset, help controls, and layout.

## Independent launch boundary

The copied source does not contain original dependencies, environment secrets, mockups, user data, or generated build assets. Existing stable package/protocol/storage identifiers stay unchanged. Quiet Studio development entry points set the supported data-base, desktop home, application-name, user-data, and session-data overrides to project-local `.quiet-studio-runtime`. Browser development uses a distinct port/origin so browser storage is not shared with the original UI. Original data is never migrated, copied, deleted, or silently reused. Environment/provider configuration must be supplied independently.

## Acceptance scenarios

1. Open actual desktop/web shell: existing task list, search, new task, project selection and tools remain usable. Exactly one Search and one Automations action appear in the sidebar; no parallel rail or duplicate product/account avatar is present.
2. Keyboard navigate sidebar: translated accessible labels, visible focus, pressed automation state, and existing collapse/restore controls remain. The Settings-only footer opens Settings; Settings still exposes Appearance. Native title-bar drag and control hit areas do not overlap: on Windows the OS caption buttons replace the renderer-drawn window controls, and no renderer control sits under a native button.
3. Choose each supported theme (10 options) and accent (6 options) in Appearance: live preview and actual surfaces change independently, chosen values persist, no extra broadcast/write path. Density setting toggles compact spacing.
4. Change interface font size: only existing `--ui-font-size` changes; code and terminal sizes remain independent.
5. Compose and submit real input with attachments: existing admission/order and optimistic overlay remain unchanged; no demo response is inserted.
6. At narrow widths, the existing sidebar open/close path remains within the layout with no extra rail; footer actions stay reachable while long project/task lists scroll independently. Editable input keeps the mobile safe font token; reduced-motion preference suppresses decorative transitions.
7. Stream and reconnect local/remote sessions: desktop continuous and mobile replayable delivery remain distinct and use unchanged owner/lease checks.
8. Launch fork with supported development commands: runtime/data paths are isolated and copied source remains free of secrets or links back to original.
