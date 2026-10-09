# Mesa Code changelog

**Status:** active history  
**Owner:** project maintainers and coding agents  
**Scope:** append-only work history for this workspace  
**Updated:** 2026-10-09 16:31 (local time)

Entries are reverse chronological. Timestamps use local workspace time. This file records events; active specifications and current source remain authoritative.

## 2026-10-09 16:39 (local time) — Windows GitHub Release automation

- **Category:** release / CI / repository hygiene
- **Scope:** ignored build output, Windows x64 installer publication, GitHub Actions release flow
- **Changed:** `.gitignore`, `.github/workflows/windows-release.yml`, `docs/specs/github-release-automation.md`, `docs/README.md`, `docs/specs/README.md`, `docs/quiet-studio/setup-and-windows-build.md`, `config/README.md`
- **Result:** Added a guarded workflow that builds exactly one Windows x64 installer on `main`, creates an immutable version/commit release tag, and uploads the installer plus available updater metadata. Local build output and signing material are ignored.
- **Verification:** Workflow and documentation source reviewed. Local command validation is recorded separately below.
- **Blocked:** This checkout has no Git metadata or remote, so local commit, push, hosted build, and GitHub Release publication were not performed.
- **Follow-up:** Configure the intended GitHub remote and authenticated operator workflow before committing or pushing.

## 2026-10-09 16:31 (local time) — Documentation system overhaul

- **Category:** documentation / maintenance
- **Scope:** documentation index, AI reading order, policy, changelog, verification ledger
- **Changed:** `docs/README.md`, `docs/documentation-policy.md`, `docs/changelog.md`, `docs/verification-log.md`
- **Result:** Added a canonical reading route, document authority model, metadata/status rules, append-only history format, and evidence ledger.
- **Verification:** Documentation content reviewed against current `AGENTS.md`, `README.md`, Quiet Studio architecture/setup documents, and active specs.
- **Blocked:** Full repository freshness and changed-architecture checks require Git metadata that this workspace does not have.
- **Follow-up:** Normalize active project landing/spec/runbook documents and audit current Markdown links.

## 2026-10-09 16:31 (local time) — Sidebar task-list refresh stability

- **Category:** UI / task-list rendering
- **Scope:** stale-while-revalidate behavior for Workspace sidebar task groups
- **Changed:** `docs/specs/quiet-studio.md`, `packages/ui/src/hooks/workspaceTaskListDisplayGroups.ts`, `packages/ui/test/workspaceTaskListDisplayGroups.test.ts`
- **Result:** Preserve the last committed task snapshot while stale activity/entity data revalidates; prevent transient `No tasks yet` flashes.
- **Verification:** Five focused regression tests passed; `pnpm typecheck` passed; `pnpm lint` passed with six existing warnings; changed-file formatting passed.
- **Blocked:** No new runtime desktop interaction evidence recorded in this entry.
- **Follow-up:** Verify the behavior in a current isolated desktop build, not an older running executable.

## 2026-10-09 16:31 (local time) — Settings-only navigation and native Git authentication

- **Category:** UI / Git / authentication boundary
- **Scope:** remove application Connect/login surface while preserving native Git push
- **Changed:** Active Quiet Studio/Git specifications, Workspace and Settings sidebar wiring, root login paths, Git push wiring, GitHub OAuth registration/listener paths
- **Result:** Settings-only footer; no application GitHub login/OAuth path; commit remains local; push uses native Git credentials. Legacy GitHub credential identifiers remain compatibility-only.
- **Verification:** Root typecheck passed; root lint passed with existing warnings; source audit found no live login-entry, GitHub adapter, or callback-listener path.
- **Blocked:** Desktop runtime interaction, installer, real commit/push, and external OAuth/network checks were not performed.
- **Follow-up:** Keep compatibility identifiers only for legacy data readability; never restore them as an enabled login or push path.
