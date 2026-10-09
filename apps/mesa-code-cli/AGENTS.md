# Mesa Code Agent CLI Rules

This directory contains the TypeScript/Node.js Agent CLI. Follow the repository rules in
[../../AGENTS.md](../../AGENTS.md), then use the [documentation index](../../docs/README.md) to route
active specifications; this file only adds CLI-specific constraints. The Node.js
and package-manager versions come from [../../mise.toml](../../mise.toml) and
[../../package.json](../../package.json).

## Development

- Update the relevant spec before changing behavior. Define ownership, interfaces, and acceptance scenarios first.
- Add or update tests for behavior changes; document bug causes in English comments.
- Keep files focused; split modules when a file grows beyond roughly 400 lines.
- Extract shared constants instead of scattering literals through business logic.
- Confirm migration, compatibility, and rollback plans before changing database schemas.
- Prefer keyboard-accessible workflows and automation-friendly interfaces.

## Platform and environment

- Support Windows, macOS, and Linux by default.
- Use Node.js cross-platform APIs (`path`, `url`, `fs`) instead of hard-coded separators or directories.
- Run external commands with argument arrays through `spawn` or `execFile`; account for `.cmd`, `.exe`, shell differences, quoting, and spaces in paths.
- Detect terminal capabilities instead of assuming TTY, color, Unicode, size, or signal support.
- Use the `MESA_CODE_` prefix for existing project environment variables. Do not add one without a spec defining its purpose, precedence, errors, and tests.

## Boundaries and contracts

- Modules communicate through small, stable, explicit interfaces. Do not depend on internal paths, globals, or undeclared conventions.
- Cross-process, storage, network, plugin, tool, or LLM data should use runtime-validated schemas, not TypeScript types alone.
- Keep external effects inside infrastructure or adapter layers. Business logic must not directly call `fetch`, `http`, `fs`, `child_process`, or `process.env`.
- Adapters must define inputs, outputs, errors, timeout, cancellation, retry, idempotency, and side-effect scope.
- Tools must declare `inputSchema`, `outputSchema`, read-only/destructive behavior, concurrency, output limits, cancellation, timeout, permissions, and scopes such as `workspace`, `git`, `network`, or `system`.
- Large tool results belong in artifacts or storage; return summaries, previews, and traceable references instead of flooding model context.
- MCP, plugins, and subagents require capability declarations, schema validation, namespace isolation, and permission checks.

## Sessions and observability

- Treat sessions, messages, tool calls, permissions, checkpoints, queues, and pending work as recoverable business state.
- TUI owns input, layout, and temporary interaction state only. Session, model, tool, todo, permission, and checkpoint state belongs in server/bootstrap/core/session layers.
- Use `+` for collapsed and `-` for expanded TUI sections.
- User interactions must use stable request/response interfaces or session events for TUI and MesaCode Protocol V4 clients.
- Propagate one `traceId` through sessions, subagents, retries, queues, tools, I/O, and provider calls. Never create unrelated trace IDs mid-flow.
- Keep provider, model, MCP, storage, proxy, and certificate details behind adapters. Configuration needs explicit system/user/project/session/CLI/environment precedence.
- Preserve debug and observability for requests, context, token/cost, tools, I/O, permissions, retries, and queues without exposing secrets or private user content.

## Errors, security, and open source

- Design failure paths first. Let errors reach the layer that can handle them; catch only to recover, retry, degrade, add context, or produce an actionable CLI message.
- Preserve the original cause when wrapping errors. Use stable error types/codes, not error text, for control flow.
- Business modules must not call `process.exit`, print directly to the terminal, or choose the final exit code; the CLI entry layer owns that behavior.
- Tests must cover missing configuration, denied permissions, network/filesystem failures, invalid input, and failed external commands.
- Do not include credentials, private data, internal URLs, personal paths, or unauthorized content in docs, examples, fixtures, logs, or commits.
- Preserve applicable attribution and licenses from [LICENSE](../../LICENSE), [NOTICE.md](../../NOTICE.md), and [THIRD-PARTY-NOTICES.md](../../THIRD-PARTY-NOTICES.md).

## Commits and verification

- Keep each feature change in a small, independently reviewable commit; do not mix unrelated refactors, dependency updates, or formatting changes.
- Before finishing, run `pnpm typecheck` and `pnpm lint` from the repository root. For CLI changes also run `pnpm --dir apps/mesa-code-cli typecheck` and `pnpm --dir apps/mesa-code-cli lint`.
- Use the target package's actual test entry points; do not assume one universal test command.
- Report commands, results, existing failures, and unverified areas honestly.
