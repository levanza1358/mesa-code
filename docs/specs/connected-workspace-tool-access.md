# Connected Workspace Tool Access

**Status:** active  
**Owner:** CLI workspace/session and tool-registry maintainers  
**Authority:** contract  
**Scope:** tool visibility for connected Git and non-Git workspaces  
**Updated:** 2026-10-12 08:39 (local time)  
**Verification:** source-only documentation review; local/remote runtime scenarios were not rerun

## Product behavior

A connected Mesa Code workspace exposes filesystem and environment tools even when the folder is
not a Git repository. Git metadata remains optional project context and must not determine whether
the model can read or work with the connected project.

## Ownership and boundaries

The connected workspace path is established by the protocol workspace/session boundary and is the
single capability boundary used by the Agent runtime. `EnvInfo.cwd` represents that runtime working
folder. Git detection only enriches context and status metadata.

## Invariants

- No connected workspace path means no workspace-scoped environment tools.
- A non-empty workspace path exposes the same built-in tool registry as a Git workspace, subject to
  the existing runtime visibility and permission policies.
- Full Access changes approval behavior only; it is not required to make tools visible.
- Local and remote workspace identity routing remains unchanged.

## Acceptance scenarios

1. A connected Git folder exposes `Read`, `Glob`, `Grep`, and shell tools.
2. A connected non-Git folder exposes `Read`, `Glob`, `Grep`, and shell tools.
3. A missing or empty workspace path exposes no workspace-scoped tools.
4. A non-Git folder can read a file through the normal permission flow.
5. Full Access bypasses eligible approval prompts but does not change tool registration.
