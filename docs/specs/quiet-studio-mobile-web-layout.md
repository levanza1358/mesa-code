# Quiet Studio mobile web layout

**Status:** active specification  
**Owner:** shared UI shell maintainers (web client)  
**Authority:** product contract for the phone-width web presentation  
**Scope:** the `@mesa-code/ui` shell and Settings page rendered by the **web** client (`isDesktop === false`) at a phone-width viewport  
**Updated:** 2026-10-11 03:25 (local time)  
**Verification:** requirements and source alignment plus focused unit tests; the phone layout itself has **not** been exercised in a real phone-width render — see [`../verification-log.md`](../verification-log.md) for the dated evidence and what remains unverified.

This document defines intended behavior. It does not by itself prove implementation or that a real phone renders correctly. Read [`../README.md`](../README.md), [`quiet-studio.md`](quiet-studio.md), and [`local-network-access.md`](local-network-access.md) for routing and ownership.

## Purpose

The web client is the same `@mesa-code/ui` `Root` the desktop window uses, but it is also opened directly by a browser — including the browser mirror that `local-network-access.md` serves on a LAN or tailnet, which a user may open **on a phone**. The desktop shell is laid out for a wide window: a fixed-width workspace sidebar beside a content column with a 320px floor, and a Settings page whose navigation is a fixed 264px column. At a phone width (≤ 767px) that geometry overflows: the sidebar plus the content floor exceed the viewport, and the Settings columns squeeze.

This specification defines a **mobile web layout** that adapts the web client to a phone viewport. It is a presentation-only change: no backend, protocol, or storage behavior changes, and **the desktop application is never placed on this layout**.

## Product rules

1. **Web-only, never desktop.** The mobile layout applies only when the client is the web client (`isDesktop` absent/false) **and** the viewport is at or below 767px. On desktop (`isDesktop === true`) the layout is disabled at any width, so a narrowed desktop window keeps the desktop shell. This is enforced by a single gate, `useIsMobileWeb(isDesktop)`, which returns `false` whenever `isDesktop` is true. Every mobile branch is written `isDesktop === false`-safe; no desktop code path reads it.
2. **One breakpoint, two halves.** The breakpoint is `max-width: 767px` — exactly Tailwind's `max-md:` range. The JavaScript hook (`MOBILE_WEB_MEDIA_QUERY`) and the CSS (`max-md:` variants) must stay in sync; a change to one without the other is a defect.
3. **No second source of truth.** "The navigation drawer is open" is the existing `isSidebarVisible` state owned by `packages/ui/src/hooks/useAppPanels.ts`. The mobile layout does not introduce a parallel open/closed flag; it renders that same state as an off-canvas drawer instead of an in-flow column.
4. **Drawer, not a pushed column.** On mobile the workspace sidebar (`#sidebar`) is `position: absolute`, left-anchored, `min(85vw, 320px)` wide, above the content, and slides in from the left. When closed it is translated off-screen and non-interactive; the chat behind it stays visible. A scrim (`bg-black/40`) is drawn between the drawer and the page only while the drawer is open, and tapping it closes the drawer.
5. **One tidy, non-overlapping control row.** The mobile header is the single control surface. It carries, left to right: the drawer toggle (`TID_MOBILE_SIDEBAR_TOGGLE`), then the task navigation (back / forward / new task), then the panel buttons (terminal / side pane) on the right. The header is shown on the phone layout even in the draft view. The floating `DesktopTopOverlay` is an absolutely-positioned control cluster at the top-left; on the phone layout it would draw on top of the header, so it is **not rendered** there (desktop keeps it — it owns the desktop sidebar toggle and new-task). The full-screen Automations main view has no workspace header, so it renders the drawer toggle as its own leading control — otherwise closing the drawer there would strand the user. None of this is rendered on desktop.
6. **The desktop window-control reserve is dropped on mobile.** The header's left padding reserves the desktop window-control area (`pl-38`/`pl-44`, for the Linux inline controls); on the phone layout there is no window chrome and the drawer toggle is the leading control, so that reserve collapses (`max-md:pl-2`) and the row sits at the header's left edge.
7. **The content floor is dropped only on mobile.** The content column's `min-w-[320px]` — which would overflow a 390px viewport beside the sidebar — is not applied on mobile. It remains on desktop and wide web.
8. **The drawer yields after navigation.** On the phone layout the drawer closes once the user has navigated to what they came for: when the active task changes (a task was picked) or when the shell switches to a full-screen main view (Settings, Automations). Opening the drawer by hand is otherwise left alone. Leaving the phone layout for a wider view restores the in-flow sidebar once, so widening the browser never strands the web shell with a hidden sidebar.
9. **Settings becomes master-detail.** At phone width the Settings page's two columns become a master→detail flow: the navigation column fills the screen (`max-md:grid-cols-1`); selecting a section shows its content instead of the list, with a back control (`TID_SETTINGS_MOBILE_BACK_TO_LIST`) that returns to the list. Both directions are gated by `isMobileWeb`, so desktop Settings is unchanged. The list keeps its group titles and section **labels** at every width — the mobile layout must never collapse into an icon-only rail (see `quiet-studio.md` and `settings-restructure.md`).
10. **Desktop markup is byte-preserved where it is pinned.** The Settings grid literal `grid-cols-[264px_minmax(0,1fr)]` and the always-visible labels are contracts pinned by existing tests (`settingsSidebarLabels.test.ts`); the mobile override is additive (`max-md:grid-cols-1`) and does not alter the literal.
11. **Local UI state stays local.** The Settings master-detail selection (`activeMobileSection`) is component-local, unpersisted state. It is not written to the workspace store and never derives server truth.
12. **Presentation only, honest evidence.** This feature adds no behavior of its own beyond layout. Its acceptance is a visual/scenario claim; it must be verified in a real phone-width render before it is reported as working, never inferred from the unit tests alone.
13. **Secure-context APIs degrade, never crash, off-localhost.** `crypto.randomUUID`, `crypto.subtle`, and `navigator.clipboard` exist only in a secure context (https / localhost). The LAN / Tailscale mirror opened on a phone over `http://<ip>:<port>` is **not** one. Every use of these in a path the phone layout can reach must either be feature-detected with a working fallback or be guarded so an absent API degrades (a copy button that does nothing) rather than throwing into an error boundary:
    - `crypto.randomUUID` — `packages/shared/src/cryptoRandomUuidPolyfill.ts` `ensureCryptoRandomUuid()` installs an entropy fallback at the web entry (`packages/web/src/main.tsx`) before the first render.
    - `crypto.subtle` — `packages/shared/src/sha256.ts` `sha256()` prefers the native digest and falls back to a dependency-free pure-JS SHA-256. It backs the pptx element-reference fingerprint (`packages/ui/src/lib/pptxElementReference.ts`) and the attachment upload checksum (`packages/ui/src/v4/attachmentUploadTransaction.ts`); neither may touch `crypto.subtle` directly.
    - `navigator.clipboard` — every call site in a phone-reachable path (`packages/ui/src/terminal/TerminalSession.tsx`, `packages/ui/src/ToolCallBlocks/ToolLayout.tsx`, `packages/ui/src/WorkspaceSidebarItem.tsx`, and the already-guarded copy buttons elsewhere) is optional-chained and swallows the (secure-context) rejection; the copy state simply stays off.
14. **Right-click is replaced by an explicit "…" row menu on touch.** A touch device fires no `contextmenu` event and has no right mouse button, so the desktop right-click task menus are unreachable on a phone; long-press cannot substitute for it because the grouped task list makes each row a `dnd-kit` draggable with a 6px activation distance, so holding a row starts (or, with finger jitter, cancels) a drag instead of opening a menu. Therefore, on a touch-only input (`hover: none`, `useIsTouchInput`), every task row renders a "…" button that opens the **same action set** as the right-click menu, through a `DropdownMenu`:
    - The one source of task actions is `TaskActionMenuContent` (`packages/ui/src/TaskActionMenuContent.tsx`), rendered both by the desktop `ContextMenu` and by the phone "…" menu via `TaskRowMoreMenu` (`packages/ui/src/TaskRowMoreMenu.tsx`), using `useTaskActionMenuProps` (`packages/ui/src/useTaskActionMenuProps.ts`) so the actions and their enable/disable rules cannot drift. The grouped view's group actions come from `GroupedTaskMenuBody` (`packages/ui/src/workspace-grouped-tasks/task-context-menu-content.tsx`), rendered through either menu family's primitives.
    - The "…" button (`TID_TASK_ROW_MORE_BUTTON`) is gated on `useIsTouchInput()` (`packages/ui/src/hooks/useIsTouchInput.ts`), so a mouse/trackpad desktop renders it never and its DOM is byte-identical. The menu body mounts only while open, so task/log path resolution stays lazy per row.
    - This does not change the desktop right-click behavior: the "…" button is additive and touch-only, and the desktop keeps using `ContextMenu` exclusively.
15. **The bottom composer tool row is one tidy row on the phone.** At phone width the composer's bottom row (leading controls + the model cluster + send) reads as a single, non-wrapping row instead of breaking into an untidy second line:
    - The row does not wrap. The leading cluster (context menu, project/Git chips, mode and CUA/browser entries) is the sole member allowed to shrink; the model cluster and the send/stop control keep their size at the row's trailing edge.
    - A long provider/model name never dominates the row. The model chip truncates with an ellipsis at a bounded width, so a very long name (`provider/model` from a custom provider) can never push the Send control or force a wrap. Its full name stays reachable through the existing tooltip and the description already set as the chip's `title`.
    - This is written as CSS on the existing quiet-studio selectors (`quiet-studio.css`), so no component is restructured. To preserve rule 1 ("never desktop") **without widening the desktop bundle**, the rule is gated on a web-only document marker (`data-mesa-code-web`, set on `<html>` by the web entry `packages/web/index.html`), not on a component `isDesktop` prop: the marker is absent in the desktop renderer, so the desktop composer keeps today's wrapping layout at every window width, no matter how narrow.
    - The existing "…-fit" measurement hook (`useComposerToolbarFit`) continues to own when a control collapses to an icon. The model chip shows its truncated name once the composer is wide enough (~384px, e.g. a 440px phone); on a narrower phone the row stays one line and the model chip remains its existing icon — the name is visible exactly when there is room for it.

## State owner and interface

- `packages/ui/src/hooks/useIsMobileWeb.ts` owns the single gate: `MOBILE_WEB_MEDIA_QUERY` (`"(max-width: 767px)"`), the pure predicate `shouldUseMobileWebLayout({ isDesktop, matchesMobileMediaQuery })` (`!isDesktop && matches`), and the `useIsMobileWeb(isDesktop, mediaQuery?)` hook. The hook's initial value is `false` (no first-paint flash, SSR-safe) and it follows `matchMedia` `change` events.
- `packages/ui/src/hooks/useAppPanels.ts` remains the owner of `isSidebarVisible` and `handleToggleSidebar`; the mobile layout only reads them.
- `packages/ui/src/app-shell/WorkspaceShellLayout.tsx` derives `isMobileWeb` and `isMobileDrawerOverlay` and owns the mobile presentation: the `#sidebar` drawer geometry, the scrim (`TID_MOBILE_SIDEBAR_SCRIM`), the mobile header inclusion, hiding the floating `DesktopTopOverlay`, the content-floor removal, and the drawer-yield/restore effect. `isDesktop` is the guard at every branch.
- `packages/ui/src/app-shell/MobileSidebarToggleButton.tsx` is the drawer button. `packages/ui/src/WorkspaceHeader.tsx` renders, when `isMobileWeb`, the leading control row (drawer toggle + task back/forward/new-task, reusing `DesktopTopOverlayActionButton`), and `WorkspaceShellLayout.tsx` renders the drawer toggle as the leading control of the full-screen Automations main view (which has no header). The header's task-navigation props (`onGoBack`, `onGoForward`, `canGoBack`, `canGoForward`) are supplied by the shell and ignored on desktop.
- `packages/shared/src/cryptoRandomUuidPolyfill.ts` owns `ensureCryptoRandomUuid()` and `packages/shared/src/uuid.ts` owns `createUuid` / `createUuidFromEntropy` (`createUuidFromEntropy` is split out so the polyfill delegates to raw entropy and cannot recurse). `packages/web/src/main.tsx` calls `ensureCryptoRandomUuid()` before the first render. This is not a layout change but the non-secure-origin prerequisite for the phone layout.
- `packages/shared/src/sha256.ts` owns the secure-context-safe digest: `sha256Bytes`/`sha256Hex` (pure JS) and `sha256()` (native WebCrypto when available, else the pure-JS path). `pptxElementReference.ts` and `attachmentUploadTransaction.ts` consume `sha256()` and must not call `crypto.subtle` directly.
- `packages/ui/src/SettingsPage.tsx` owns the Settings master-detail selection and its two gated columns.
- `packages/ui/src/hooks/useIsTouchInput.ts` owns the touch-only signal (`(hover: none)`). `packages/ui/src/TaskRowMoreMenu.tsx` owns the "…" dropdown shell; `packages/ui/src/TaskActionMenuContent.tsx` (body) and `packages/ui/src/useTaskActionMenuProps.ts` (props builder) are the single source of task actions shared by the right-click and "…" menus; `packages/ui/src/workspace-grouped-tasks/task-context-menu-content.tsx` `GroupedTaskMenuBody` is the single source of the grouped view's group actions.
- `packages/shared/src/test-ids.ts` owns `TID_MOBILE_SIDEBAR_TOGGLE`, `TID_MOBILE_SIDEBAR_SCRIM`, `TID_SETTINGS_MOBILE_BACK_TO_LIST`; `packages/ui/src/i18n/locales/{en-US,zh-CN}.ts` own `workspace.mobileMenu` and `settings.mobileBackToList`.
- `packages/web/index.html` owns the web-only document marker `data-mesa-code-web` (set on `<html>` in the same pre-bundle script that marks `data-mesa-code-browser-theme-surface`). It is the CSS gate for web-only presentation rules (the phone composer row, rule 15) that must not reach the desktop renderer; the desktop `index.html` never sets it. `packages/ui/src/quiet-studio.css` owns the phone composer-row rule itself. `packages/ui/src/prompt-editor/useComposerToolbarFit.ts` remains the owner of the composer's "…-fit" icon-collapse measurement.

## Event order

```
viewport ≤ 767px and isDesktop === false
        │
        ▼
useIsMobileWeb → isMobileWeb = true
        │
        ├─ #sidebar  → off-canvas drawer (absolute, translate-x), keyed on isSidebarVisible
        ├─ scrim     → rendered only while isSidebarVisible (isMobileDrawerOverlay)
        ├─ header    → one row: drawer toggle + back/forward/new-task + panel buttons
        ├─ overlay   → DesktopTopOverlay not rendered (would overlap the header)
        ├─ #content  → drops min-w-[320px]
        └─ Settings  → max-md:grid-cols-1, one column visible via activeMobileSection

user picks a task OR enters a full-screen main view (Settings/Automations)
        │
        ▼
drawer-yield effect → isSidebarVisible = false (drawer slides out; scrim removed)

viewport grows past 767px (still web)
        │
        ▼
isMobileWeb flips false → restore effect (only on the isMobileWeb true→false edge)
        → isSidebarVisible = true (in-flow sidebar back)
```

## Acceptance scenarios

1. On the **desktop** app, resizing the window below 767px changes nothing about the shell: no drawer, no scrim, no menu button, and the sidebar keeps its in-flow width and resize handle.
2. On the **web** client at ≤ 767px, the workspace sidebar is an off-canvas drawer: closed by default (off-screen), sliding in from the left when the header menu button is pressed, over a scrim, with the chat still visible behind it.
3. Tapping the scrim, or pressing the menu button again, closes the drawer.
4. Selecting a task, or opening a full-screen main view (Settings or Automations), closes the drawer; the content is not left covered.
5. Growing the browser past 767px restores the in-flow sidebar exactly once.
6. On web at ≤ 767px the header shows a single, non-overlapping row — drawer toggle, back/forward/new-task, and the panel buttons — with no floating cluster drawn on top of it; the back/forward buttons are disabled when there is nowhere to go, matching the desktop overlay.
7. On web at ≤ 767px, Settings shows its section **list** first; picking a section shows its content with a back control that returns to the list. Group titles and section labels remain visible in the list at every width.
8. On web at ≤ 767px, the conversation/content column is not forced to 320px and does not overflow the viewport horizontally.
9. On the **desktop** app, Settings is unchanged: the two columns, the fixed 264px navigation column, and the desktop back affordance are all as before.
10. The phone-layout strings (`workspace.mobileMenu`, `settings.mobileBackToList`) render their translated text in both maintained catalogs, never the raw message id.
11. On the web client opened over a **non-secure origin** (the LAN / Tailscale mirror at `http://<ip>:<port>`, which is the phone case), the app must render past the first paint instead of crashing: `crypto.randomUUID` is installed by a fallback at the web entry (`ensureCryptoRandomUuid`), so `crypto.randomUUID is not a function` never reaches an error boundary. This is a prerequisite for the phone layout to be usable at all off-localhost.
12. On that same non-secure origin, the digest- and clipboard-dependent features do not throw: the pptx element-reference fingerprint and the attachment upload checksum hash through `sha256()` (pure-JS fallback when `crypto.subtle` is undefined), and every reachable copy action (terminal copy/paste, tool-layout failure tooltip, sidebar remote-error) is optional-chained so an absent `navigator.clipboard` degrades instead of raising an uncaught error.
13. On a touch-only input (a phone), each task row shows a "…" button (`TID_TASK_ROW_MORE_BUTTON`); tapping it opens the full task-action menu (in the grouped view also the group actions), matching the desktop right-click menu item for item. On a hover-capable input (mouse/trackpad), no "…" button is rendered and the row is unchanged from before this rule.
14. On the **web** client at phone width with a long provider/model name (e.g. `mirai/cbcn/deepseek-v4.1-flash`), the composer's bottom row is a single row: it does not wrap, the project/branch chips and the model chip truncate rather than dominate the row, and the send control stays at the row's trailing edge with no horizontal overflow. When the composer is wide enough (~384px) the model chip shows the truncated name; on a narrower phone the chip falls back to its existing icon (the name is visible exactly when there is room). On a narrower composer the existing fitter may still collapse controls to icons. On the **desktop** renderer the composer keeps its existing wrapping layout at every window width, including a narrow window below 767px — the phone rule is gated on the web-only `data-mesa-code-web` marker, which the desktop document never sets.

## Out of scope

- Any change to the desktop application's layout, chrome, or sidebar toggle.
- A touch-gesture edge-swipe to open the drawer (the header button and scrim are the only controls).
- Making the entire web client mobile-first; this adapts the existing desktop-first shell at one breakpoint.
- Replacing the v4 composer/session internals; those already carry `max-md:` density adaptations and are not restructured here.
- Offline behavior, PWA install, or iOS-specific input handling beyond the existing `--text-mobile-input-safe` token.
