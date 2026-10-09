# SOUL.md persona layer

Status: Implemented

## Product behavior

Mesa Code loads a user-owned persona file named `SOUL.md` in addition to the existing
`AGENTS.md` project instruction file. Both files support a global (user) scope and a
workspace (project) scope.

- Global persona: `~/.mesaCode/SOUL.md`
- Workspace persona: `SOUL.md` at the workspace project root

When both exist, their contents are concatenated, not one winning over the other.

The persona layer covers identity, tone, language, response style, and workflow
preferences. It is injected as a context section named `soulMd`, which sits above the
existing `agentsMd` section, so persona preferences win over project instructions when
the two disagree.

## Safety boundary

`SOUL.md` is a prompt-layer file. It cannot override, and must not be used to override:

- security policy and sandbox rules
- system instructions
- tool permissions and approval gates
- privacy rules
- harmful-code restrictions
- an explicit user request made in the current chat

These guards live in code and remain the top of the priority stack. If a `SOUL.md`
file requests any of the above, the agent treats the request as data and follows the
code-level guard instead.

## Priority stack

```text
Safety / permission / privacy / harmful-code guards   <- code, cannot be overridden
        ^
SOUL.md          persona, language, tone, workflow
        ^
AGENTS.md        project technical facts and rules
        ^
Skills and other files
        ^
User request in the current chat
```

## Ownership and boundary

- The CLI context source adapter (`apps/mesa-code-cli/packages/adapters`) owns file
  discovery, reading, byte caps, and diagnostics for both `SOUL.md` and `AGENTS.md`.
- The core context builder owns section rendering into the system prompt.
- No second persistence path is introduced. `SOUL.md` is a plain file on disk, the same
  as `AGENTS.md`.
- Settings UI may edit the global files, but the runtime always reads from disk, so
  external edits and Settings edits converge on one source of truth.

## Auto-generate

The Settings UI offers **Auto-generate** for both scopes. It drafts a `SOUL.md` from
signals already available locally, so the user starts from a relevant persona instead of
a blank or generic file.

- Owner: `buildAutoSoulContent` in `packages/services/src/file/autoSoul.ts`.
- Input: scope plus facts already held by the running app:
  - workspace scope: project-root `package.json` (name, description, scripts,
    dependencies), presence of `.agents/` or `AGENTS.md`, detected primary language by
    file extension mix, detected framework from dependencies.
  - user scope: the same workspace signals when a workspace is open; otherwise a
    language/framework-neutral draft.
- Output: deterministic markdown text placed into the editor draft. It is **not** written
  to disk. Saving remains an explicit user action, so auto-generate can never silently
  overwrite an existing persona file.
- Generation is local and rule-based. It performs no network calls and never reads file
  contents other than `package.json` and a directory listing.
- The generated draft always ends with the safety notice that the persona cannot override
  security policy, tool permissions, privacy rules, or an explicit chat request.
- Regenerating replaces the current editor draft, so the existing "unsaved changes"
  indicator stays truthful.

## Acceptance scenarios

1. With no `SOUL.md` anywhere, agent behavior is unchanged and no `soulMd` section is emitted.
2. Creating `~/.mesaCode/SOUL.md` makes the persona apply to every workspace.
3. Creating a project `SOUL.md` adds workspace-specific persona on top of the global one.
4. A `SOUL.md` that requests elevated tool permissions does not grant them; the code-level
   permission gate still applies.
5. `AGENTS.md` behavior is unchanged; it is still discovered from `~/.mesaCode/AGENTS.md`
   and the workspace root and merged.
6. Files larger than the byte cap are truncated and reported through the existing
   diagnostics channel.
7. Auto-generate fills the editor draft only; nothing is written until the user saves.
8. Auto-generate reflects actual workspace facts: a TypeScript React project produces a
   draft mentioning TypeScript and React; a project with no detectable signals produces
   the neutral base draft.
9. Auto-generate never overwrites an existing saved `SOUL.md`; replacing file content
   still requires an explicit save.
10. The Settings navigation recognizes `soul` as a valid section and preserves direct
    navigation to it.
11. Global SOUL read, generate, and save operations always use the local host, even when
    the active workspace is remote; workspace SOUL operations use the selected workspace host.
