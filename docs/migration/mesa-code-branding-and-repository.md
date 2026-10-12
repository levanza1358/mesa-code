# Mesa Code branding and repository

**Status:** active migration reference  
**Owner:** repository and release maintainers  
**Authority:** product naming and compatibility identifiers  
**Scope:** Mesa Code branding, package names, paths, and repository identity  
**Updated:** 2026-10-12 08:39 (local time)  
**Verification:** source-only documentation review; naming and storage differences are not migration authorization

Read the [documentation index](../README.md) first. This is a compatibility reference, not a request to bulk-rename source or storage identifiers.

## Purpose

Mesa Code is the product and technical project name. This document records the
product naming rule, the internal identifier convention, and the canonical Git
repository.

The naming convention is pinned in the [naming specification](../specs/mesa-code-naming.md).
It is a rule for new work, not certification that every current file or import
conforms: existing camelCase files remain in the checkout. Do not bulk-rename
those files or compatibility identifiers as part of a documentation refresh.

## Product naming

Use **Mesa Code** in user-facing text:

- application title and window labels
- installer and uninstaller text
- onboarding, welcome, settings, errors, and notifications
- logos, icons, tray entries, and shortcuts
- README files and public documentation

Provider names such as `Z.ai` remain unchanged because they identify an
external provider.

## Internal identifier convention

Internal identifiers use the Mesa Code convention. They are stable and must not
be bulk-renamed, because they affect package resolution, persisted data,
protocol compatibility, update behavior, and existing user installations:

- package scope `@mesa-code/*`
- CLI application directory `apps/mesa-code-cli`
- environment variables `MESA_CODE_*`
- protocol modules `mesa-code-protocol`, `mesa-code-protocol-v4`
- storage directory `.mesaCode/` and ignore file `.mesaCodeignore`
- canonical logo assets under `public/logo/`

File names and symbol names follow the same convention: kebab-case files
(`mesa-code-agent-service.ts`) with PascalCase/camelCase symbols
(`MesaCodeAgentService`, `mesaCodeAgentService`). The full rule is pinned in
`docs/specs/mesa-code-naming.md`.

## Storage behavior

A workspace-free conversation uses the fallback directory:

```text
~/.mesaCode/workspace/default
```

This directory is an Agent working directory, not a user-selected project. It
exists because the Agent process requires a real current working directory.

The user data root is `~/.mesaCode/` (camelCase), which holds `workspace/`,
`v2/`, `workflows/`, `SOUL.md`, `AGENTS.md`, and the CLI config.

## Repository source of truth

Canonical Git remote:

```text
https://github.com/levanza1358/mesacode.git
```

All pushes, issue references, and repository links target this remote. Local
internal package names do not define repository identity.

## Validation

Run from the repository root after branding or packaging changes:

```powershell
pnpm typecheck
pnpm lint
pnpm architecture:check --changed
pnpm fmt:check
```

For Windows installer validation:

```powershell
$env:MESA_CODE_SKIP_REMOTE_ASSETS="1"
pnpm bundle:desktop
```

Verify that the built installer, executable, shortcut, tray icon, and visible UI
all show Mesa Code branding.
