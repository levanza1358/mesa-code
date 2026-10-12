# Mesa Code Naming

**Status:** active  
**Owner:** repository and shared-protocol maintainers  
**Authority:** contract  
**Scope:** new file/symbol naming, import spelling, and stable compatibility identifiers  
**Updated:** 2026-10-12 08:39 (local time)  
**Verification:** source-only documentation review; naming rules do not certify every existing file

## Purpose

Pin the file-naming and identifier-naming rules so the repository stays
consistent. The rule was derived from the canonical package
(`packages/shared/src`), which already used kebab-case file names with
PascalCase symbols.

## File names

- Source file names use **lower-kebab-case**.
- Mesa Code-specific modules keep the `mesa-code-` prefix:
  `mesa-code-task-types-core.ts`, `mesa-code-agent-service.ts`,
  `mesa-code-protocol/`, `mesa-code-protocol-v4/`.
- Ordinary domain modules drop the prefix:
  `remote-workspace-rpc.ts`, `task-index-repo.ts`, `conversation-share.ts`. Existing camelCase files are not a precedent for new names; this rule does not authorize bulk-renaming compatibility identifiers.
- Never use `mesa-codeFoo.ts` (hyphen prefix + camelCase suffix) or
  `mesaCodeFoo.ts` (all camelCase).
- Test files end in `.test.ts`; fixtures live under `test/fixtures/`.

## Symbols

- Types and classes use **PascalCase** with a capital `C` in `MesaCode`:
  `MesaCodeTaskMeta`, `MesaCodeAgentService`.
- Functions and variables use **camelCase**: `createMesaCodeAgentConnectionScope`,
  `mesaCodeTaskService`, `useMesaCodeIntl`.
- A symbol never contains a hyphen. `mesa-code-agent-service` is a file name,
  not an identifier.

## Import specifiers

An import specifier mirrors the target file name exactly, including hyphens and
the `.js` extension required by NodeNext:

```ts
import { createMesaCodeAgentConnectionScope } from "./mesa-code-agent-connection-scope.js";
import type { MesaCodeTaskMeta } from "@mesa-code/shared";
```

A specifier must never rewrite the path to camelCase.

## Stable compatibility identifiers

These keep their exact spelling because they cross a compatibility boundary and
renaming them would break package resolution, persisted data, protocol
compatibility, or existing installations:

| Kind | Value |
| --- | --- |
| Package scope | `@mesa-code/*` |
| CLI directory | `apps/mesa-code-cli` |
| Environment variables | `MESA_CODE_*` |
| Storage | `.mesaCode/`, `.mesaCodeignore` |
| Deep link | `mesa-code://` |
| Protocol modules | `mesa-code-protocol`, `mesa-code-protocol-v4` |
| Persisted keys | `mesa-code-theme`, `mesa-code-accent` |
| Object-storage / service channel keys | `mesaCodeTaskService`, `mesaCodeAgentService`, `mesaCodeSessionService` |

The service channel keys are camelCase because they are property names on
`IServiceAccessor`, not file paths.

## Invariants

1. No source file name uses `mesa-codeFoo` or `mesaCodeFoo`.
2. No import specifier spells a path in camelCase.
3. No identifier contains a hyphen.
4. Commands executed on Windows match identifiers case-insensitively; prefer
   `rg --files-with-matches` over `Select-String -Path`.
5. A rename keeps the module boundaries and import depth intact so the
   architecture check (`forbidDeepImports`, `maxFileLines`) still passes.

## Verification

```powershell
pnpm typecheck
pnpm lint
pnpm architecture:check --changed
```

All `mesa-code*` source files must be kebab-case, every package must typecheck,
and the test suites under `packages/*/test` and `apps/mesa-code-cli/packages/*/test`
must pass.
