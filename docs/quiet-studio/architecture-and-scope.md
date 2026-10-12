# Quiet Studio architecture and scope

**Status:** active architecture document  
**Owner:** Quiet Studio maintainers  
**Authority:** ownership, dependency direction, scope, and verification boundaries  
**Scope:** Stage 1 presentation architecture, separately scoped Settings work, and preserved backend boundaries  
**Updated:** 2026-10-12 08:37 (local time)

Use this document after the [documentation index](../README.md) and [Stage 1 specification](../specs/quiet-studio.md). Use [`verification-log.md`](../verification-log.md) for evidence; this document does not assert that a runtime or installer passed.

Quiet Studio is a staged presentation variant of **Mesa Code**. This separate project retains the copied desktop, web, server, services, RPC, shared contracts, client SDK, provider packages, and Agent CLI. It is not a new runtime, package namespace, or protocol.

## Stage 1 boundary

The [Stage 1 specification](../specs/quiet-studio.md) owns shell, sidebar, chat, and Appearance product rules and acceptance scenarios. Keep real repository exploration, editing, command execution, Git, workspaces, tools, MCP, plugins, skills, providers, and session history. Work outside that presentation boundary requires its own specification, not an inference from Stage 1. Current separate contracts include [application login removal/native Git authentication](../specs/github-only-login-and-push.md), [Settings restructuring](../specs/settings-restructure.md), [Notifications and Sound](../specs/notification-settings.md), [provider Apply/Test](../specs/custom-provider-connection-apply-and-test.md), [LAN access](../specs/local-network-access.md), and [mobile web layout](../specs/quiet-studio-mobile-web-layout.md). [Liquid](../specs/liquid-theme.md) extends Appearance. Use the [complete catalog](../specs/README.md) for other bounded work. A concept mockup does not prove implemented behavior or authorize fake conversations.

Read [DESIGN.md](../../DESIGN.md) for layout and accessibility and [setup](setup-and-windows-build.md) before launching. Never modify the original project or borrow its secrets or user data. Historical/archive documentation and skills remain unchanged.

The requested builtin productivity skill expansion is a separate bounded deliverable under [its specification](../specs/builtin-productivity-skills.md). It uses the existing plugin bundle/seeding/installer path, without changing plugin UI, protocol, or user lifecycle ownership.

## Owners and interfaces

| Concern                                                 | Existing owner / interface                                                                                                                           | Presentation constraint                                                                                  |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Theme, accent, interface font size, Liquid transparency | `store/index.ts`, `store/appearanceState.ts`, `useTheme.ts`, `lib/liquidTransparency.ts`                                                             | Existing setters, persistence and guarded broadcast; Liquid opacity projects onto semantic tokens        |
| Settings navigation and content                         | `lib/settingsNavigation.ts`, `settings/settingsPageConfig.ts`, `SettingsPage.tsx`                                                                    | Navigation identifiers/config do not prove a matching content branch; preserve legacy-id migration       |
| Notification routing and sound                          | `lib/taskNotificationPreferences.ts`, `store/index.ts`, notification hooks/helpers, `settings/NotificationsSection.tsx`, `settings/SoundSection.tsx` | Separate Settings destinations share the existing typed preference record; no duplicate preference owner |
| Provider connection drafts                              | `InlineEditableProviderCard`, existing provider save/connectivity services                                                                           | Draft locally; Apply writes through the existing owner; Test is explicit and uses applied configuration  |
| Sidebar visibility and width                            | `app-shell/WorkspaceShellLayout.tsx`, `WorkspaceSidebar.tsx`, existing tab/command handlers                                                          | Single sidebar projects existing navigation; do not duplicate actions or selection                       |
| Drafts and optimistic session overlay                   | Existing composer and UI session stores                                                                                                              | Only uncommitted input belongs in Renderer                                                               |
| Accepted input and runtime queue                        | CLI/runtime `CommandInbox`, Host owner/lease                                                                                                         | Preserve serial admission, routing and stale-run guards                                                  |
| Business persistence                                    | `packages/services`, existing repositories                                                                                                           | UI reads through hooks and service interfaces, never Repo directly                                       |
| Native operations                                       | Injected `IPlatformService` in `packages/shared/src/platform.ts`                                                                                     | No direct window bridge from UI                                                                          |
| Windows and process forwarding                          | Electron Main                                                                                                                                        | No task/session business-state ownership                                                                 |
| Connections                                             | Window-scoped Local Host and in-window remote connection registry                                                                                    | Do not create a second Desktop Remote Host                                                               |

Paths in the owner table are relative to `packages/ui/src` unless fully qualified.

## Event order

```text
Appearance action
  => existing preference setter
  => preference persistence + guarded broadcast
  => existing theme/accent application
  => semantic CSS tokens / UI projection

Notifications / Sound action (separate Settings destinations)
  => existing typed preference setter
  => persistence + guarded cross-window synchronization
  => event/focus/channel routing
  => toast / OS notification / Main-owned pill / sound playback

Provider connection draft
  => explicit Apply -> existing provider save owner
  => clean applied draft -> explicit Test -> existing connectivity/discovery path
  => inline result (not proof of a successful live provider until exercised)

Sidebar action
  => existing shell/tab/command handler
  => existing selected workspace and navigation projection

Composer draft
  => existing command admission
  => Host owner/lease routing
  => CommandInbox serial acceptance
  => session runtime and business persistence
  => existing conversation events
  => Renderer timeline / optimistic overlay reconciliation
```

No presentation-specific network calls, admission queues, persistence writes, timeout-based synchronization, or competing scroll owners. Preserve virtualization and measured row heights.

## Identity and remote invariants

- Identity key: `workspaceIdentity?.trim() || workspacePath`. Use it for binding, deduplication, cache, persistence and request correlation.
- `workspacePath` remains file-operation and command cwd, not remote identity.
- Remote paths carry `workspaceIdentity` and `remoteSessionId` end to end; retain local-path fallback and existing identity helpers.
- Desktop `desktop-continuous` remains direct live delivery. Mobile `web-remote-replayable` remains snapshot, replay and gap repair. Presentation must not merge these semantics.
- Mobile attaches to the desktop's existing Host/session runtime. Relay and Main perform authentication, pairing, heartbeat, forwarding and attachment scheduling, not snapshot or queue ownership.
- Keep owner/lease, cross-Host routing, stale-run protection and broadcast feedback guards.

## Data and delivery status

Stable package, protocol and persisted identifiers remain unchanged. Current service data root is `<dataBaseDir>/.mesaCode` in `packages/services/src/paths.ts`; older identifiers and migration behavior must not be bulk-renamed or deleted.

Current public desktop and web development scripts invoke `scripts/quiet-studio-dev.mjs`. It sets project-local `.quiet-studio-runtime` home/data paths, Electron identity/user/session paths, and separate web ports. Direct package scripts, `dev:server`, and `dev:desktop:remote-prod` bypass this wrapper; do not assume they are isolated. This review confirms source configuration only; dated runtime evidence in the ledger applies only to its named scenario, not every launch or persistence path. Packaging identity is separate from development runtime isolation: the existing NSIS package still uses Mesa Code metadata.

Current limits must remain visible:

- Settings restructuring is partial: General still includes Migration, the data-directory row, and rows targeted for removal; `dataLocation` has navigation metadata but no content branch. The reported General error `1 is not a function` remains unresolved; neither HMR nor malformed persistence is an established cause.
- Liquid is implemented in source with focused-test and CSS-engine evidence; running-app material, contrast, and live slider visuals remain unverified.
- Chat switching is not verified fixed. `SessionPane` passes `lease?.sessionId ?? sessionId` into `useConversationProjection`; an existing stale lease therefore matches the argument and cannot trigger that hook's mismatch guard. Isolated guard tests do not establish the caller's visual behavior.
- The ledger records a 2026-10-11 21:45 unsigned 1.0.2 installer build and artifact inspection, not install/launch. Later Notifications, Sound, and pill-answer source changes are not covered by that artifact record.

This document records scope and inspected owners, not completed redesign. Verify actual launch, state persistence, keyboard/mobile interaction and both remote delivery paths against their specifications before release.
