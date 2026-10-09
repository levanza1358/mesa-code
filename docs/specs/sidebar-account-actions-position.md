# Sidebar Account Actions Position

**Status:** superseded  
**Owner:** historical sidebar presentation work  
**Authority:** historical context only  
**Scope:** former account/login footer placement  
**Updated:** 2026-10-09 16:31 (local time)

> Superseded by [`github-only-login-and-push.md`](github-only-login-and-push.md) and the active [`quiet-studio.md`](quiet-studio.md). Do not use this document to restore Connect, profile, login, logout, or account controls.

## Product behavior

The sidebar account entry (login/profile) and Settings button are primary workspace controls and must
appear above the New task action. New task remains the first task-creation action below the account
row, followed by Search and the remaining navigation actions. The existing account row is moved;
login/profile and Settings are not duplicated.

## Ownership

`packages/ui/src/WorkspaceSidebar.tsx` owns the sidebar layout order. The existing
`WorkspaceSidebarFooter` remains the owner of profile/login/logout behavior, Settings navigation,
theme controls, usage actions, and account-menu state. This change moves the existing component; it
does not create a second login or settings path.

## Invariants

- Login/profile behavior and the Settings button keep their existing callbacks, labels, test IDs,
  and menu contents.
- The account row is rendered once, above New task.
- New task keeps its existing disabled/read-only behavior and creation callbacks.
- The account row remains available when the task list is scrolled.
- Desktop, web, and remote workspace layouts use the same ordering.

## Acceptance scenarios

1. The sidebar renders the account/login row first, then New task, then Search.
2. Clicking Settings from the moved row opens the same Settings destination.
3. Clicking the unauthenticated account row still exposes the existing Login menu action.
4. New task retains its shortcut, read-only tooltip, and existing task-creation behavior.
5. The account row is not duplicated at the bottom of the sidebar.

## Implementation

`WorkspaceSidebar.tsx` renders `WorkspaceSidebarFooter` in the top navigation block before
`NewTaskButtonGroup`. The footer is removed from the bottom of the sidebar. Its existing callbacks,
menu state, test IDs, and account actions remain owned by `WorkspaceSidebarFooter`.

## Sidebar visual hierarchy

### Product rule

The sidebar should present a compact, calm navigation hierarchy: account controls are one compact
surface, primary actions share consistent row sizing, and task sections have clear separation without
large empty gaps.

### Invariants

- Existing account, navigation, task, drag-and-drop, and settings behavior is unchanged.
- The sidebar remains usable at narrow desktop widths and does not introduce horizontal overflow.
- Icon-only actions retain accessible labels and visible keyboard focus states.
- Theme colors continue to come from semantic design tokens.

### Acceptance scenarios

1. The account row, primary actions, and task switcher read as three distinct compact groups.
2. Pinned, project, and task content begins immediately after its section header without excessive gaps.
3. Long workspace and task names remain truncated instead of expanding the sidebar.
4. Hover and keyboard focus states remain visible for all sidebar actions.

## Shared home and settings sidebar size

### Product rule

The Home workspace sidebar and Settings sidebar use the same desktop width so navigation does not
jump horizontally when moving between the two surfaces.

### Ownership

- `WorkspaceSidebarWidthProvider` owns the canonical persisted sidebar width and publishes
  `--workspace-sidebar-width` from a common ancestor of Home and Settings.
- `WorkspaceShellLayout` owns resize interaction only and commits completed width changes to the
  provider.
- `SettingsPage` consumes the inherited variable for its navigation column.

### Invariants

- Settings keeps a single navigation column and does not introduce a second width state.
- The shared width remains compatible with the existing workspace resize and persistence behavior.
- The main Settings content continues to occupy the remaining available width.
- The provider wraps the sibling Home and Settings overlay surfaces, so the resized value is inherited
  by both rather than falling back to a shell-local CSS variable.

### Acceptance scenarios

1. Resizing the Home sidebar and then opening Settings shows a Settings navigation column with the
   committed Home width.
2. Closing Settings returns to Home without changing the selected sidebar width.
3. Settings rendered without an active workspace uses the global default width of 264px.

## Settings account entry placement

### Product rule

On desktop Settings, the shared profile/account entry and its Settings button appear at the top of the
navigation block. The icon-only Back to workspace control follows them before the scrollable settings
sections. The account entry uses the same horizontal inset and compact padding as Home. This gives
Settings the same compact account-control hierarchy as Home and avoids an isolated control at the bottom
of a tall sidebar.

### Ownership

`SettingsPage` owns placement of the existing `WorkspaceSidebarFooter` in the Settings navigation
layout. `WorkspaceSidebarFooter` continues to own profile menu state, account actions, theme controls,
and callbacks. This is a layout-only relocation; it does not add state, subscriptions, or a second
account entry.

### Invariants

- The Settings profile/account entry renders exactly once on desktop and retains its existing props,
  test IDs, menu contents, and callbacks.
- The settings-section navigation remains the sole scrollable region.
- Narrow layouts continue to hide the desktop account entry as before.
- Moving the entry does not change Settings data fetching or create additional render paths.
- Back to workspace keeps its icon, tooltip, and accessible label, but does not render visible text.
- The account entry uses the same `WorkspaceSidebarFooter` layout class as the Home sidebar.
- The Settings upper navigation block uses Home's platform-specific vertical padding: `py-1.5` on
  Windows and `py-2` elsewhere.

### Acceptance scenarios

1. On a desktop Settings page, the profile/account entry and Settings button are followed by the
   icon-only Back to workspace control and then the section navigation.
2. The profile entry remains visible while a long settings-section list scrolls.
3. Opening the profile menu, using Back to workspace, and opening usage/settings retain their existing
   behavior.
4. The account card's left and right inset matches the Home sidebar at the same sidebar width.
5. The account card's top inset matches the Home sidebar for the current desktop platform.
