# Mesa Code documentation

**Status:** active index  
**Owner:** project maintainers and coding agents  
**Scope:** documentation routing, authority, and verification boundaries  
**Updated:** 2026-10-12 08:37 (local time)

This is the canonical documentation entry point for the Mesa Code Quiet Studio workspace. It tells people and AI agents what to read, in what order, and which document is authoritative for each question.

## Required AI reading order

1. Read the root [`AGENTS.md`](../AGENTS.md). It defines the workspace boundary, security rules, architecture rules, language rules, and required checks.
2. Read this file. Route the request using the task table below.
3. Read the active product specification for the requested behavior. Specifications define intended product rules and acceptance scenarios; they do not prove implementation.
4. Read the relevant architecture/scope document and controlled module context before changing code.
5. For UI work, read [`DESIGN.md`](../DESIGN.md). For plugin-store work, read [`CONTEXT.md`](../CONTEXT.md).
6. Read the setup/build runbook only when the task launches, builds, packages, or verifies a platform.
7. Use [`verification-log.md`](verification-log.md) for dated evidence and [`changelog.md`](changelog.md) for history. Neither document overrides current source, package scripts, or active specifications.

Do not read every document by default. Read the smallest authoritative set that covers the request and its dependencies. The [specification catalog](specs/README.md) lists every specification, including historical and superseded contracts; the table below is a task router, not an exhaustive catalog.

## Task routing

| Task                                                     | Read first                                                                                                                                                                                                             | Then read                                                                                                                                                                                                                                               | Main source areas                                                                                                                             |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Quiet Studio shell, sidebar, Appearance                  | [`specs/quiet-studio.md`](specs/quiet-studio.md)                                                                                                                                                                       | [`quiet-studio/architecture-and-scope.md`](quiet-studio/architecture-and-scope.md), [`DESIGN.md`](../DESIGN.md)                                                                                                                                         | `packages/ui`, `packages/desktop`                                                                                                             |
| Chat streaming, timeline, composer                       | [`specs/quiet-studio.md`](specs/quiet-studio.md)                                                                                                                                                                       | [`specs/conversation-rendering-performance.md`](specs/conversation-rendering-performance.md), [`specs/conversation-image-previews.md`](specs/conversation-image-previews.md), [`DESIGN.md`](../DESIGN.md)                                               | `packages/ui/src/v4`                                                                                                                          |
| Sidebar task list or refresh                             | [`specs/quiet-studio.md`](specs/quiet-studio.md)                                                                                                                                                                       | relevant `packages/ui` hook/store and tests                                                                                                                                                                                                             | `packages/ui/src/hooks`, `packages/ui/src/store`                                                                                              |
| Settings navigation, General, Extensions, Data Location  | [`specs/settings-restructure.md`](specs/settings-restructure.md)                                                                                                                                                       | [`quiet-studio/architecture-and-scope.md`](quiet-studio/architecture-and-scope.md), [`DESIGN.md`](../DESIGN.md); partial implementation and unresolved General error are recorded in the spec                                                           | `packages/ui/src/SettingsPage.tsx`, `packages/ui/src/settings`, `packages/ui/src/lib/settingsNavigation.ts`                                   |
| Sound presets, volume, custom sound, preview             | [`specs/notification-settings.md`](specs/notification-settings.md) (Sound section)                                                                                                                                     | [`specs/settings-restructure.md`](specs/settings-restructure.md); Sound and Notifications are separate Settings destinations                                                                                                                            | `packages/ui/src/settings/SoundSection.tsx`, `packages/ui/src/lib`, `packages/ui/src/store`                                                   |
| Liquid material, transparency, theme vocabulary          | [`specs/liquid-theme.md`](specs/liquid-theme.md)                                                                                                                                                                       | [`theme-catalog.md`](theme-catalog.md), [`DESIGN.md`](../DESIGN.md); running-app visuals remain unverified                                                                                                                                              | `packages/ui/src/styles.css`, `packages/ui/src/quiet-studio.css`, `packages/ui/src/store`, `packages/desktop/src/main/desktopWindowChrome.ts` |
| Notifications and their settings                         | [`specs/notification-settings.md`](specs/notification-settings.md)                                                                                                                                                     | [`specs/notification-pill-overlay.md`](specs/notification-pill-overlay.md), [`specs/subagent-stall-detection.md`](specs/subagent-stall-detection.md)                                                                                                    | `packages/ui/src/hooks`, `packages/ui/src/lib`, `packages/ui/src/settings`, `packages/desktop/src/main`, `packages/shared`                    |
| Git, Settings-only navigation, application login removal | [`specs/github-only-login-and-push.md`](specs/github-only-login-and-push.md)                                                                                                                                           | [`quiet-studio/architecture-and-scope.md`](quiet-studio/architecture-and-scope.md)                                                                                                                                                                      | `packages/ui`, `packages/services/src/git`, `packages/services/src/oauth`, `packages/desktop`                                                 |
| Provider API keys and model settings                     | [`specs/custom-provider-connection-apply-and-test.md`](specs/custom-provider-connection-apply-and-test.md)                                                                                                             | [`specs/custom-provider-only-model-settings.md`](specs/custom-provider-only-model-settings.md), [`specs/custom-provider-model-discovery.md`](specs/custom-provider-model-discovery.md); [`CONTEXT.md`](../CONTEXT.md) only for plugin-store terminology | `packages/ui/src/settings`, `packages/services/src/model-provider`                                                                            |
| Plugins and marketplace                                  | [`CONTEXT.md`](../CONTEXT.md)                                                                                                                                                                                          | [`docs/skills/catalog-and-controls.md`](skills/catalog-and-controls.md)                                                                                                                                                                                 | `packages/ui`, `packages/services`, plugin resources                                                                                          |
| Skills and subagents                                     | [`specs/built-in-subagents.md`](specs/built-in-subagents.md), [`specs/builtin-productivity-skills.md`](specs/builtin-productivity-skills.md), [`specs/subagent-stall-detection.md`](specs/subagent-stall-detection.md) | relevant CLI package `AGENTS.md`                                                                                                                                                                                                                        | `apps/mesa-code-cli`, `packages/ui`                                                                                                           |
| Protocol, storage, migration, compatibility              | [`specs/mesa-code-naming.md`](specs/mesa-code-naming.md)                                                                                                                                                               | [`migration/mesa-code-branding-and-repository.md`](migration/mesa-code-branding-and-repository.md)                                                                                                                                                      | `packages/shared`, `packages/services`                                                                                                        |
| Desktop, web, Windows build, isolation                   | [`quiet-studio/setup-and-windows-build.md`](quiet-studio/setup-and-windows-build.md)                                                                                                                                   | [`build-tools.md`](build-tools.md), [`quiet-studio/architecture-and-scope.md`](quiet-studio/architecture-and-scope.md)                                                                                                                                  | `packages/desktop`, `packages/web`, `scripts`                                                                                                 |
| LAN/Tailscale access to the running session              | [`specs/local-network-access.md`](specs/local-network-access.md)                                                                                                                                                       | [`specs/settings-restructure.md`](specs/settings-restructure.md), [`quiet-studio/setup-and-windows-build.md`](quiet-studio/setup-and-windows-build.md) for the standalone `@mesa-code/server` path                                                      | `packages/desktop/src/host`, `packages/services/src/network-access`, `packages/ui/src/settings`, `packages/server`                            |
| Web client on a phone (mobile layout)                    | [`specs/quiet-studio-mobile-web-layout.md`](specs/quiet-studio-mobile-web-layout.md)                                                                                                                                   | [`specs/quiet-studio.md`](specs/quiet-studio.md), [`specs/web-remote-reconnect.md`](specs/web-remote-reconnect.md), [`specs/local-network-access.md`](specs/local-network-access.md) (the LAN mirror may be opened on a phone)                          | `packages/ui` (`Root`, `app-shell`, `SettingsPage`), `packages/web`                                                                           |
| GitHub push, Windows `.exe`, release automation          | [`specs/github-release-automation.md`](specs/github-release-automation.md)                                                                                                                                             | [`quiet-studio/setup-and-windows-build.md`](quiet-studio/setup-and-windows-build.md)                                                                                                                                                                    | `.github/workflows`, `packages/desktop`, `.gitignore`                                                                                         |
| CLI/runtime behavior                                     | [`apps/mesa-code-cli/AGENTS.md`](../apps/mesa-code-cli/AGENTS.md)                                                                                                                                                      | the relevant active spec                                                                                                                                                                                                                                | `apps/mesa-code-cli`                                                                                                                          |
| Documentation-only change                                | this file                                                                                                                                                                                                              | [`documentation-policy.md`](documentation-policy.md)                                                                                                                                                                                                    | `docs`, root Markdown                                                                                                                         |

## Authority model

Use this order when documents disagree:

1. Current source and current `package.json` scripts define what exists.
2. Active specifications define intended product behavior and acceptance scenarios.
3. Architecture and design documents define ownership, dependency direction, and presentation constraints.
4. Setup documents define supported commands and isolation requirements.
5. Verification records prove only the dated command or scenario they record.
6. Changelog entries record what changed; they are not behavioral contracts.
7. Historical, archive, migration, and third-party documents provide context only unless explicitly linked by an active document.

Never claim a test, runtime check, installer, or release passed from a specification or changelog entry alone. Source implementation, focused tests, runtime interaction, and packaging are separate evidence classes. A dated installer record does not establish that later source changes were packaged. Known counter-evidence must remain explicit: the General Settings error is unresolved; chat-switch correctness is not established by isolated projection-guard tests.

## Document classes

- **Active specification:** product contract and acceptance scenarios. Current behavior changes require updating it first.
- **Architecture/runbook:** ownership, boundaries, setup, build, and verification procedure.
- **Reference:** vocabulary, naming, theme catalog, configuration, or migration compatibility.
- **Historical/archive:** retained context. Do not use it as current product truth without an active link.
- **Generated/third-party notice:** legal or generated material. Do not hand-edit for product changes.

The full metadata and status rules are in [`documentation-policy.md`](documentation-policy.md).

## Current project documents

- [`README.md`](../README.md): concise project landing page.
- [`AGENTS.md`](../AGENTS.md): mandatory workspace and engineering instructions.
- [`specs/README.md`](specs/README.md): complete specification catalog and implementation/evidence caveats.
- [`DESIGN.md`](../DESIGN.md): UI design rules for coding agents.
- [`theme-catalog.md`](theme-catalog.md): selectable themes, accents, and appearance compatibility.
- [`CONTEXT.md`](../CONTEXT.md): plugin-store vocabulary.
- [`quiet-studio/architecture-and-scope.md`](quiet-studio/architecture-and-scope.md): Stage 1 ownership and scope.
- [`quiet-studio/setup-and-windows-build.md`](quiet-studio/setup-and-windows-build.md): isolated development and Windows build runbook.
- [`build-tools.md`](build-tools.md): external build tool cache, bootstrap, and checksums.
- [`changelog.md`](changelog.md): append-only dated change history.
- [`verification-log.md`](verification-log.md): append-only dated evidence ledger.

## Safe documentation workflow

```text
Request
  -> docs/README.md routing
  -> active specification and architecture owner
  -> current source and package scripts
  -> focused implementation or investigation
  -> dated verification evidence
  -> append-only changelog entry
```

Documentation work introduces no runtime state, protocol, persistence, dependency, timer, or product behavior unless an active specification explicitly says otherwise.
