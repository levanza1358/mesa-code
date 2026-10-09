# GitHub release automation

**Status:** active specification  
**Owner:** release and desktop maintainers  
**Authority:** release procedure and artifact contract  
**Scope:** Windows x64 installer publication from an approved Git push  
**Updated:** 2026-10-09 16:39 (local time)  
**Verification:** workflow source review; hosted-run evidence is recorded separately in [`../verification-log.md`](../verification-log.md)

## Product rule

A push to the release branch builds the existing Windows x64 desktop bundle and publishes the resulting installer as a GitHub Release. Manual dispatch supports the same operation without requiring a new source commit.

The workflow uses the repository-provided `GITHUB_TOKEN` only for release publication. It does not implement application login, GitHub OAuth, Git credential injection, or credential storage.

## Release identity

Each release tag is immutable and unique to the source commit:

```text
v<package-version>-<short-commit-sha>
```

A repeated workflow run for the same commit must fail rather than overwrite an existing release. A later commit receives a different tag even when `package.json` keeps the same version.

## Artifact contract

The workflow runs the existing packaging entry point for Windows x64:

```text
MESA_CODE_SKIP_REMOTE_ASSETS=1 pnpm bundle:desktop -- --os win --arch x64
```

The build must produce exactly one installer matching:

```text
packages/desktop/dist/MesaCode-<version>-win-x64.exe
```

The release attaches the installer and any matching updater metadata generated beside it (`.blockmap` and `latest.yml` when present). The generated `dist` directory remains ignored and is never committed.

## Ownership and boundaries

- `package.json` owns the release version input.
- `packages/desktop/scripts/bundle.mjs` owns Windows packaging and artifact validation.
- `.github/workflows/windows-release.yml` owns CI sequencing, release identity, and publication.
- GitHub Actions owns the temporary runner workspace and release upload.
- Native Git credentials remain outside this application and workflow contract.

## Acceptance scenarios

1. A push to `main` starts one Windows x64 packaging job.
2. The job installs the pinned pnpm version from the root package manifest and uses Node 24.
3. The job fails when the installer is missing or when more than one matching installer exists.
4. The job creates a unique tag containing the package version and source commit prefix.
5. The job fails instead of replacing an existing release for the same tag.
6. A successful release contains the `.exe` installer and available updater metadata.
7. No GitHub OAuth token, application login state, signing secret, or user credential is written to the repository or artifact.
8. Local checkout remains clean because build output and release staging files are ignored.

## Non-goals

This automation does not sign installers, perform a local commit, configure a Git remote, or bypass GitHub authentication. Those require repository access and credentials supplied by the operator.
