# Verification log

**Status:** active evidence ledger  
**Owner:** project maintainers and coding agents  
**Scope:** dated source, test, runtime, build, and packaging evidence  
**Updated:** 2026-10-09 16:46 (local time)

This file is append-only. Each entry proves only the command or scenario named in that entry. Specifications, source, and package scripts remain authoritative for behavior.

## 2026-10-09 16:39 (local time)

| Class     | Command or scenario                                                    | Result             | Evidence / limitation                                                                                                                                                                      |
| --------- | ---------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Source    | Workflow and release-spec review                                       | Pass               | `.github/workflows/windows-release.yml` uses the existing Windows bundle entry point, checks exactly one installer, refuses an existing tag, and publishes with the runner `GITHUB_TOKEN`. |
| Source    | Markdown link audit                                                    | Partial            | Newly added release links resolve by source inspection. Full repository-wide link validation was not available from the current non-Git checkout.                                          |
| Installer | `pnpm bundle:desktop -- --os win --arch x64`                           | Not run            | Windows packaging can be run locally, but no current artifact result was produced in this documentation/configuration pass.                                                                |
| Git       | `git status`, `git remote -v`                                          | Blocked            | This workspace has no `.git` metadata, so commit, push, hosted workflow, and GitHub Release cannot run.                                                                                    |
| Installer | Existing `packages/desktop/dist/MesaCode-1.0.0-win-x64.exe` inspection | Observed           | One existing 149,328,065-byte installer was present. It was not rebuilt, signed, uploaded, or treated as current release evidence.                                                         |
| Source    | `pnpm typecheck`                                                       | Pass               | Workspace TypeScript checks completed after release workflow and documentation changes.                                                                                                    |
| Source    | `pnpm lint`                                                            | Pass with warnings | No lint errors; six existing unused-variable warnings remain in UI files.                                                                                                                  |
| Source    | `pnpm exec oxfmt --check` on changed files                             | Pass               | `.gitignore`, workflow-adjacent docs, specs, and dependency documentation are formatted.                                                                                                   |
| Source    | Markdown relative-link audit                                           | Pass               | 137 source Markdown files checked; all relative links resolve.                                                                                                                             |

## Evidence classes

- **Source:** typecheck, lint, formatting, architecture, dependency/reference audits.
- **Focused test:** a targeted unit/regression test.
- **Runtime:** an isolated desktop, web, mobile, or interaction scenario.
- **Installer:** packaging, artifact inspection, installation, signature, launch, or uninstall.
- **Blocked:** command could not provide evidence because the environment or required metadata was unavailable.

## 2026-10-09 16:31 (local time)

| Class        | Command or scenario                                                                                                 | Result             | Evidence / limitation                                                                                                       |
| ------------ | ------------------------------------------------------------------------------------------------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Source       | `pnpm typecheck`                                                                                                    | Pass               | TypeScript project build completed for the configured workspace packages.                                                   |
| Source       | `pnpm lint`                                                                                                         | Pass with warnings | No lint errors; six existing unused-variable warnings remain in `Root.tsx`, `SettingsPage.tsx`, and `WorkspaceSidebar.tsx`. |
| Source       | `pnpm exec oxfmt --check` on changed task-list files                                                                | Pass               | Changed specification, implementation, and test files use the project formatter.                                            |
| Focused test | `pnpm exec tsx --tsconfig packages/ui/tsconfig.json --test packages/ui/test/workspaceTaskListDisplayGroups.test.ts` | Pass               | Five tests: stale snapshot retention, first hydration, confirmed empty result, archive removal, and reference reuse.        |
| Source       | `pnpm architecture:check --changed`                                                                                 | Blocked            | Workspace has no Git repository metadata; command failed at `git ls-files`.                                                 |
| Source       | `node scripts/check-workspace-freshness.mjs`                                                                        | Blocked            | Workspace has no usable Git origin; `git fetch origin --prune` failed.                                                      |
| Runtime      | Current isolated desktop task-list refresh interaction                                                              | Not run            | Source fix is verified; no current runtime result is claimed in this entry.                                                 |
| Installer    | Windows `.exe` build/install/signature                                                                              | Not run            | No packaging or installation evidence.                                                                                      |

## Reporting rules

- A passing typecheck does not prove runtime behavior.
- A focused test does not prove desktop/web/mobile parity.
- A source audit does not prove an installer or external authentication flow.
- A blocked command remains blocked; do not convert it to a pass in later summaries.
- Add a new dated entry when rerunning a command or scenario. Do not overwrite prior evidence.
