# Mesa Code: Quiet Studio working boundary

Work only in `C:\Users\Kuroneko\Documents\project\mesacode-quiet-studio`. Never modify the original `C:\Users\Kuroneko\Documents\project\mesacode` project or reuse its environment secrets or runtime data.

Quiet Studio is a presentation variant of **Mesa Code**, not a package, protocol, or storage rename. Stage 1 covers the shared shell, chat, sidebar, and Appearance only; retain backend behavior and other features. Read the [documentation index](docs/README.md) after this file; it routes the active spec, architecture, design, setup, and evidence documents for each task. Historical/archive documents and skills are not redesign targets.

Use current source and package scripts as truth. Spec acceptance scenarios describe required outcomes, not proof of completion. Verify isolation before launch; copying source alone does not isolate runtime data. Do not claim runtime checks or an installer passed without current evidence.

Stable `@mesa-code/*`, `MESA_CODE_*`, protocol and storage identifiers remain compatible. Never silently discard existing user data; apply existing idempotent migration adapters where required.
## Core principles

- Update the corresponding spec before adding or changing behavior; create the directory when it does not exist. Define product rules, state owner, interface, and acceptance scenarios before writing code.
- For documentation changes, follow [`docs/documentation-policy.md`](docs/documentation-policy.md), update the canonical index when routing changes, and append dated entries to [`docs/changelog.md`](docs/changelog.md) and [`docs/verification-log.md`](docs/verification-log.md) when history or evidence changes. Documentation-only edits do not require code checks unless they change code-adjacent generated/configuration files.
- Treat the currently checked-out source, `package.json`, and the architecture policy as the source of truth. Keep only features, commands, and files that this repository actually provides; when removing a feature, clean up its references in instructions and skills at the same time.
- When investigating a problem, find the cause first unless a code change was explicitly requested. Combine source, logs, and runtime evidence, and separate confirmed causes from assumptions still to be verified.
- Preserve local changes unrelated to the current task. Do not restore removed modules or internal dependencies on your own.

## Commands and repository structure

Run `node scripts/check-workspace-freshness.mjs` before starting work to check the baseline. Use the Node version defined in `mise.toml`.

Run the following commands from the repository root:

| Purpose               | Command                                 |
| --------------------- | --------------------------------------- |
| Typecheck             | `pnpm typecheck`                        |
| Lint                  | `pnpm lint` / `pnpm lint:fix`           |
| Format check          | `pnpm fmt:check`                        |
| Desktop development   | `pnpm dev:desktop`                      |
| Web development       | `pnpm dev:web`                          |
| Pre-push check        | `pnpm verify:pre-push` (lint + arch)    |
| Architecture check    | `pnpm architecture:check --changed`     |
| Module reading pack   | `pnpm architecture:context <module-id>` |
| Unused deps / exports | `pnpm knip`                             |
| Export references     | `pnpm dep:refs --list-exports <file>`   |

Test entry points are defined by the target package's current `package.json` and its actual test files. Do not assume a single unified unit-test or E2E command exists.

- `packages/desktop`: Electron main, host, and renderer.
- `packages/web`, `packages/server`: web client and server.
- `packages/ui`: shared React components, hooks, and Zustand stores.
- `packages/services`: business services; `packages/rpc`: RPC framework.
- `packages/shared`: shared protocol and types; `packages/client`: Agent client SDK.
- `apps/mesa-code-cli`: Agent CLI and runtime.
- `CONTEXT.md`: plugin store domain vocabulary; read before changing related UI.
- `DESIGN.md`: UI design guidelines; read before changing UI.

## Product naming

- The product name is **Mesa Code**. Use it in user-facing text, documentation, and UI copy.
- Internal identifiers intentionally keep the `mesa-code` name for compatibility: package names (`@mesa-code/*`), directories (`apps/mesa-code-cli`), environment variables (`MESA_CODE_*`), protocol files (`mesa-code-protocol`), and storage paths (`.mesa-code/`).
- Do not bulk-rename these internal identifiers. Renaming them breaks packaging, protocol compatibility, and existing user data directories.

## Implementation and verification

- For code changes, follow `.agents/skills/architecture-governance/SKILL.md`: run the architecture check first, then read the controlled context of the target module.
- Avoid duplicated state and multiple write paths. Make the single owner, interface, dependency direction, event order, and idempotency boundary explicit. Do not use timeouts to paper over synchronization problems.
- Add tests whenever behavior changes; interaction changes need E2E scenarios. Verify that tests and implementation agree, and actually run the available verification. State plainly when something was not run or the environment prevented it.
- When fixing a bug, write the comment explaining the cause and the basis for the fix **in English**. When you find a design flaw, align with the user first instead of adding more and more fallback branches.
- For designs involving state, ordering, remote, or async synchronization, include a diagram showing owners and event order.
- Always run `pnpm typecheck` and `pnpm lint`, and report the real results. Never describe an existing failure as a pass.
- Use async file and network IO. Import across packages through public entry points and follow existing path aliases.
- UI must not call Repo directly, Service must not reference concrete Runtime implementations, and cross-domain implementation imports and circular dependencies are forbidden.

## UI and platform boundaries

- Follow `DESIGN.md`, reuse existing components, and account for desktop and mobile web layout, interaction, theme, and internationalization.
- Components access services through `packages/ui/src/hooks/`; platform operations go through `IPlatformService` (`packages/shared/src/platform.ts`), never `window.mesa-code` directly.
- Handle Desktop, Web, local, and remote differences through dependency injection, and account for Windows, macOS, and Linux.
- Zustand state lives in `packages/ui/src/store/`. Broadcast-synced fields such as theme and language must guard against feedback loops; local UI state must not be mistaken for server truth.
- Files under `hooks/` that contain JSX use `.tsx`.

## Process, protocol, and remote control

- The Desktop app talks to the Agent over stdio. When the protocol changes, also update `packages/shared/src/mesa-code-protocol/index.ts` with strict types and runtime validation.
- Main owns windows, native operations, process scheduling, and message forwarding. It does not carry task/session business state.
- Each window uses one window-scoped Local Host; a local workspace shares that Host. Remote workspaces are managed by the in-window connection registry; do not create a separate Desktop Remote Host.
- Mobile remote control attaches to the desktop's existing Host attachment and reuses the session runtime. Do not start a separate Agent, Local Host, or remote session for mobile.
- The desktop `desktop-continuous` realtime path and the mobile `web-remote-replayable` recovery path must stay clearly distinct. When changing stream, snapshot, queue, or reconnect, verify both semantics.
- External relay and Main only perform authentication, pairing, heartbeat, forwarding, and attachment scheduling. They do not store business state such as task queues or snapshots.
- Accepted busy/running input is admitted serially by the CLI/runtime `CommandInbox`. The Renderer keeps only uncommitted drafts and pending optimistic overlay; the Host owner/lease owns routing.
- Keep owner/lease, cross-Host routing, and stale-run protection. Do not remove boundary checks just because only one path is visible.

## Workspace identity

- `workspaceIdentity` is for identity isolation; `workspacePath` is for file operations, command cwd, Git, and path display.
- The identity key is always `workspaceIdentity?.trim() || workspacePath`, and applies to dedupe, binding, cache, queue, persistence, and request correlation.
- Remote paths must carry `workspaceIdentity` and `remoteSessionId` end to end. Never match on path alone.
- New interfaces keep a local-path fallback. Remote identity reuses existing construction and parsing helpers; do not hand-write formats in business code.

## Logging

- UI uses `packages/ui/src/logger.ts`, never `console.log` or `window.mesa-code?.log` directly.
- Agent/session/runtime service logs use `createServiceLogger(scope)` (`packages/services/src/logger/serviceLogger.ts`).
- `debug` is for protocol raw data, streaming chunks, and per-item tool updates: high-frequency diagnostics that are not persisted in production.
- `info` is for process and session lifecycle, permission results, and one-time initialization: production-useful events.
- `warn` is for recoverable anomalies; `error` is for crashes, handshake failures, lost authentication, and other unrecoverable errors.
- Never write credentials, real user data, or internal service addresses in logs, examples, or commits.

## Language

- Write all source comments, documentation, and commit messages in **English**.
- Chinese is allowed only inside shipped localization catalogs such as `packages/ui/src/i18n/locales/zh-CN.ts`, which is a product translation file rather than project documentation.

## Naming

Identifier names and file names follow the Mesa Code convention.

- **File names use kebab-case**: `mesa-code-task-types-core.ts`, `mesa-code-agent-service.ts`.
  Domain files that are not Mesa Code-specific follow the ordinary lower-kebab style: `remote-workspace-rpc.ts`, `task-index-repo.ts`.
- **Symbols use PascalCase / camelCase**: `MesaCodeTaskMeta`, `createMesaCodeAgentConnectionScope`, `mesaCodeTaskService`.
  Note the capital `C` in `MesaCode`; a symbol never uses a hyphen.
- **Import specifiers mirror the file name**: `import { x } from "./mesa-code-agent-service.js"`.
  A specifier never drops the hyphens to camelCase the path.
- **Stable protocol and storage identifiers keep their exact spelling**, because they cross a compatibility boundary:
  package scopes `@mesa-code/*`, CLI directory `apps/mesa-code-cli`, environment variables `MESA_CODE_*`,
  storage `.mesa-code/` and `.mesa-codeignore`, deep links `mesa-code://`, protocol modules `mesa-code-protocol`,
  and persisted keys such as `mesa-code-theme` and `mesa-code-accent`.
- **Do not bulk-rename these identifiers**; renaming them affects package resolution, persisted data,
  protocol compatibility, and existing installations. See `docs/migration/mesa-code-branding-and-repository.md`.

The rule is pinned by `docs/specs/mesa-code-naming.md`.
