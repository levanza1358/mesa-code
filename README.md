# Mesa Code — Quiet Studio

**Status:** active landing page  
**Owner:** project maintainers  
**Scope:** project overview, documentation routes, and development entry points  
**Updated:** 2026-10-12 08:37 (local time)

Mesa Code is an AI-powered coding workspace for desktop, web, and terminal. Quiet Studio is a presentation variant in this checkout, not a package, backend, protocol, or storage rename.

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
# Run from the checkout containing AGENTS.md.
node scripts/check-workspace-freshness.mjs
pnpm install
pnpm tools:bootstrap
$env:MESA_CODE_SKIP_REMOTE_ASSETS = '1'
pnpm prepare:desktop-runtime
pnpm build:bootstrap
```

`pnpm tools:bootstrap` downloads and verifies the Electron Builder helper bundles (`winCodeSign`, NSIS, NSIS resources) into `.tools/`; it is optional here because `pnpm bundle:desktop` runs it automatically. Runtime preparation handles Electron, native search tools, and other runtime assets separately. See the [setup runbook](docs/quiet-studio/setup-and-windows-build.md) for the current `pnpm bootstrap` path mismatch and explicit preparation sequence.

Public entry points:

| Task                              | Command                                                                                                           | Boundary                                                                                           |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Desktop test environment          | `pnpm dev:desktop:test`                                                                                           | Quiet Studio wrapper configures project-local runtime paths                                        |
| Desktop production environment    | `pnpm dev:desktop`                                                                                                | Uses the same isolation wrapper; also builds the web client so the Settings → Network mirror works |
| Web development                   | `pnpm dev:web`                                                                                                    | Wrapper configures server/client ports; verify connectivity                                        |
| Reach the app from another device | Settings → **Network** (in `dev:desktop`), or a standalone `pnpm dev:server` with `MESA_CODE_SERVER_HOST=0.0.0.0` | Open access (no token) by product decision; see the LAN/Tailscale section of the setup runbook     |
| Windows x64 package               | `pnpm bundle:desktop -- --os win --arch x64`                                                                      | Artifact, signature, install, and launch require separate evidence                                 |

Electron Builder helper bundles are cached under `.tools/` and downloaded on demand; see [`docs/build-tools.md`](docs/build-tools.md).
`build-installer.bat` checks for those tools before bumping the installer version
and starting the build.

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

This checkout has Git metadata. Freshness and changed-architecture checks still depend on the available baseline; report missing refs or upstream access rather than treating a local result as proof of freshness.

## Implementation and evidence boundaries

The [specification catalog](docs/specs/README.md) routes the separately scoped Settings restructure, Notifications and Sound controls, provider Apply/Test, Liquid theme, mobile layout, and reconnect work. Settings restructuring remains partial: Migration and data-directory controls remain in General, `dataLocation` has no content branch, and rows intended for removal remain. The reported General Settings error `1 is not a function` is unresolved.

Liquid is implemented in source, but its running-app material and slider appearance are not visually verified. Chat-switch correctness is not established by isolated guard tests; see the conversation performance specification and current evidence limitations. The ledger's 2026-10-11 21:45 installer record covers an unsigned 1.0.2 build and artifact inspection, not installation or launch, nor later Notifications, Sound, or pill-answer changes. No build or app launch was performed for this documentation refresh.

## Source layout

| Directory                                     | Responsibility                                  |
| --------------------------------------------- | ----------------------------------------------- |
| `packages/desktop`                            | Electron Main, Host, Renderer, packaging        |
| `packages/ui`                                 | Shared React components, hooks, Zustand stores  |
| `packages/web`, `packages/server`             | Browser client and server                       |
| `packages/services`                           | Business services and persistence               |
| `packages/shared`, `packages/rpc`             | Contracts, validation, protocol, and RPC        |
| `packages/client`                             | Agent client SDK                                |
| `packages/provider`, `packages/provider-node` | Provider capabilities                           |
| `apps/mesa-code-cli`                          | Agent CLI, TUI, runtime, and tools              |
| `config`, `scripts`, `docs`                   | Configuration, build tooling, and documentation |

## Compatibility

The product name is **Mesa Code**. Stable `@mesa-code/*`, `MESA_CODE_*`, `apps/mesa-code-cli`, protocol, deep-link, and persisted identifiers retain their exact spelling. Do not bulk-rename them or discard old data. See the [naming rules](docs/specs/mesa-code-naming.md) and [migration boundary](docs/migration/mesa-code-branding-and-repository.md).

## License

See `LICENSE`, [`NOTICE.md`](NOTICE.md), and [`THIRD-PARTY-NOTICES.md`](THIRD-PARTY-NOTICES.md). Attribution does not establish release provenance or permission to reuse another checkout's runtime data.
