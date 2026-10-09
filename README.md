# Mesa Code — Quiet Studio

Mesa Code is an AI-powered coding workspace for desktop, web, and terminal. Quiet Studio is a presentation variant in this separate workspace, not a package, backend, protocol, or storage rename.

## Start here

- [Documentation index and AI reading order](docs/README.md)
- [Documentation policy](docs/documentation-policy.md)
- [Changelog](docs/changelog.md)
- [Verification log](docs/verification-log.md)
- [Workspace boundary and engineering rules](AGENTS.md)
- [Quiet Studio Stage 1 specification](docs/specs/quiet-studio.md)
- [Architecture and scope](docs/quiet-studio/architecture-and-scope.md)
- [Setup, isolation, validation, and Windows build](docs/quiet-studio/setup-and-windows-build.md)
- [UI design system](DESIGN.md)
- [Plugin-store vocabulary](CONTEXT.md)

Read `AGENTS.md` first, then `docs/README.md`. The documentation index routes task-specific reading. Current source and package scripts remain the final authority.

## Stage 1 scope

Quiet Studio changes the shared shell, sidebar, chat, and Appearance presentation. Existing repository exploration, editing, command/test execution, Git, local and remote workspaces, tools, MCP, plugins, skills, providers, and session history remain available. Acceptance scenarios describe required outcomes; they do not prove implementation or runtime completion.

## Development

Use Node.js **24.14.0** and pnpm **10.33.2**, pinned in `mise.toml` and the root package manifest. Run only inside this workspace:

```powershell
Set-Location 'C:\Users\Kuroneko\Documents\project\mesacode-quiet-studio'
pnpm install
$env:MESA_CODE_SKIP_REMOTE_ASSETS = '1'
pnpm prepare:desktop-runtime
pnpm build:bootstrap
```

Public entry points:

| Task | Command | Boundary |
| --- | --- | --- |
| Desktop test environment | `pnpm dev:desktop:test` | Quiet Studio wrapper configures project-local runtime paths |
| Desktop production environment | `pnpm dev:desktop` | Uses the same isolation wrapper |
| Web development | `pnpm dev:web` | Wrapper configures server/client ports; verify connectivity |
| Windows x64 package | `pnpm bundle:desktop -- --os win --arch x64` | Artifact, signature, install, and launch require separate evidence |

Source copying does not isolate runtime data. Do not reuse the original project's secrets, provider files, `.env.local`, or runtime directories. See the setup runbook for exact isolation boundaries.

## Validation

```powershell
pnpm typecheck
pnpm lint
pnpm fmt:check
pnpm architecture:check --changed
pnpm verify:pre-push
```

Test entry points belong to the target package and its actual test files; there is no universal test command. Record actual results in [`docs/verification-log.md`](docs/verification-log.md). Do not claim a runtime, installer, external authentication, commit, or push passed without current evidence.

This source copy may lack Git metadata. Freshness and changed-architecture checks then remain blocked; report that limitation instead of treating it as a pass.

## Source layout

| Directory | Responsibility |
| --- | --- |
| `packages/desktop` | Electron Main, Host, Renderer, packaging |
| `packages/ui` | Shared React components, hooks, Zustand stores |
| `packages/web`, `packages/server` | Browser client and server |
| `packages/services` | Business services and persistence |
| `packages/shared`, `packages/rpc` | Contracts, validation, protocol, and RPC |
| `packages/client` | Agent client SDK |
| `packages/provider`, `packages/provider-node` | Provider capabilities |
| `apps/mesa-code-cli` | Agent CLI, TUI, runtime, and tools |
| `config`, `scripts`, `docs` | Configuration, build tooling, and documentation |

## Compatibility

The product name is **Mesa Code**. Stable `@mesa-code/*`, `MESA_CODE_*`, `apps/mesa-code-cli`, protocol, deep-link, and persisted identifiers retain their exact spelling. Do not bulk-rename them or discard old data. See the [naming rules](docs/specs/mesa-code-naming.md) and [migration boundary](docs/migration/mesa-code-branding-and-repository.md).

## License

See `LICENSE`, [`NOTICE.md`](NOTICE.md), and [`THIRD-PARTY-NOTICES.md`](THIRD-PARTY-NOTICES.md). The original source URL is retained as attribution; this copied workspace does not establish a configured Git origin.
