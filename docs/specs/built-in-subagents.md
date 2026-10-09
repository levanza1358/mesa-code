# Built-in subagents roster

## Product rules

Mesa Code ships a curated roster of **built-in subagents** that the Agent tool can delegate to. Each built-in is a source-defined profile (not a file on disk) with a focused purpose, an explicit identity color, and the smallest tool surface that lets it do its job. The roster grows from two agents to eight:

| Name              | Purpose (one line)                                            | Tools                                              | Read-only |
| ----------------- | ------------------------------------------------------------ | -------------------------------------------------- | --------- |
| `general-purpose` | Research and execute multi-step tasks across the codebase    | `["*"]` (all tools)                                | no        |
| `Explore`         | Read-only broad fan-out search; returns conclusions          | `Bash, Glob, Grep, Read, WebFetch, WebSearch, TodoWrite` | yes  |
| `Plan`            | Architect: produce an implementation plan; no edits          | `Read, Grep, Glob, Bash, WebFetch, WebSearch, TodoWrite` | yes  |
| `Verify`          | Independently confirm claims/findings by running checks      | `Read, Grep, Glob, Bash, WebFetch, WebSearch, TodoWrite` | yes  |
| `CodeReviewer`    | Review a diff/patch for bugs, regressions, and security      | `Read, Grep, Glob, Bash, WebFetch, WebSearch, TodoWrite` | yes  |
| `Debugger`        | Find root cause from symptoms, logs, and failing tests       | `Read, Grep, Glob, Bash, WebFetch, WebSearch, TodoWrite` | yes  |
| `Writer`          | Author documentation and prose                               | `Read, Write, Edit, Bash, Glob, Grep, TodoWrite`    | no        |
| `Tester`          | Author and run tests                                         | `Read, Write, Edit, Bash, Glob, Grep, TodoWrite`    | no        |

Rules:

- **One source of truth.** The roster name list and its descriptive metadata live in exactly one place: `packages/shared/src/built-in-subagents.ts`. Core, services, and bootstrap consume it; none of them re-declares names, colors, tools, or descriptions.
- **Prompts are baked in.** A built-in profile carries a non-empty `systemPrompt` built at construction time (as `general-purpose` already does). The runtime only substitutes a prompt for the built-in `Explore` profile when its stored prompt is empty; every other built-in must supply its own prompt, so a new built-in never runs with a missing prompt.
- **Per-agent model override.** Every built-in name is a valid key in the persisted `builtInModelSelectionOverrides` map, so the Settings screen can set or clear a model/effort override for any built-in, not just the original two.
- **Names are reserved.** User and plugin agents cannot reuse a built-in name; the reserved set is the shared roster name list.
- **`general-purpose` stays the default.** Omitting `subagent_type` still resolves to `general-purpose`.
- **Unknown types still error.** A `subagent_type` that no profile owns keeps failing with `agent_unknown_type` (`AgentErrorCode.UNKNOWN_AGENT_TYPE`); the roster does not become a catch-all.
- **Overrides still win in order.** A user or project profile with the same name replaces the built-in in the normalized profile list; a project-source profile still cannot raise its own permission mode.
- **Explore is unchanged.** Explore keeps its dedicated read-only toolset, embedded-search branch, and yolo permission path (`isBuiltInExploreAgentProfile`). New built-ins run through the ordinary main toolset with their profile `tools` list; "read-only" for the new agents is enforced by their tool surface (no `Write`/`Edit`), not by the Explore special case.
- **Writer and Tester may write.** They include `Write`/`Edit` because authoring is their purpose; they remain normal subagents subject to the caller's permission mode.
- **Installer delivery follows from being code.** Built-ins are compiled into the CLI bundle `apps/mesa-code-cli/packages/cli/dist/mesa-code.cjs`, which the installer stages as `agent/mesa-code.cjs`. Adding a built-in requires no separate "include in installer" step — only a rebuild — and this is proven by grepping the built bundle for the new names, not assumed.

## Owner, interface, and dependency direction

Single owner: **`packages/shared/src/built-in-subagents.ts`** exports `BUILT_IN_SUBAGENT_METADATA`, `BUILT_IN_SUBAGENT_NAMES`, and derived types (`BuiltInSubagentName`, `BuiltInSubagentMetadata`). Everyone else is a consumer:

- **core** (`apps/mesa-code-cli/packages/core/src/subagent/profile.ts`) seeds one `AgentProfile` per roster entry in `normalizeAgentProfiles`, pairing shared metadata with the per-agent `systemPrompt` builder.
- **services** (`packages/services/src/subagents/subagentsService.ts`) maps the same metadata into `createBuiltInAgents` for the Settings list, and derives its reserved-name set from `BUILT_IN_SUBAGENT_NAMES`.
- **bootstrap** (`apps/mesa-code-cli/packages/bootstrap/src/subagents.ts`) derives `RESERVED_AGENT_NAMES` from `BUILT_IN_SUBAGENT_NAMES` and parses overrides by iterating the roster.
- **UI** (`packages/ui/src/settings/SubagentsSection.tsx`) treats any built-in agent as model-override-capable.

Dependency direction stays shared → consumed by core/services/bootstrap/UI; no consumer is imported back into shared. No new wire-protocol field and no new write path are introduced.

```text
BUILT_IN_SUBAGENT_METADATA (shared, single owner)
  |--> core normalizeAgentProfiles -> AgentProfile + systemPrompt builder
  |        |-> Agent tool: name -> profile -> child runtime (toolset: main)
  |        \-> Agent tool prompt: "- <name>: <description> (Tools: ...)"
  |--> services createBuiltInAgents -> Settings list (AgentsListResult.agents)
  \--> bootstrap/subagents reserved names + override parsing
agents-state.json builtInModelSelectionOverrides: { <built-in name>: ModelSelection }
  -> normalizeAgentProfiles applies it -> Agent tool prompt & Settings reflect it
```

## Acceptance scenarios

1. **Roster appears in Settings.** `list` returns all eight built-ins with `scope: "built-in"`, `source: "built-in"`, `readOnly: true`, `path: "built-in:<name>"`, and the metadata color/tools for each.
2. **Roster appears in the Agent tool prompt.** `formatAgentProfilesForPrompt` lists all eight names with their one-line descriptions and tool surface.
3. **Default preserved.** With no `subagent_type`, the resolved profile is `general-purpose`.
4. **Unknown type still errors.** An unmatched `subagent_type` yields `AgentErrorCode.UNKNOWN_AGENT_TYPE`, and the child runtime is not started.
5. **Per-built-in override persists and restores.** Setting then clearing a model override for any built-in name (old or new) writes/deletes that key in `builtInModelSelectionOverrides`; the value round-trips through `agents-state.json` and is reflected by the Settings list and the Agent tool prompt.
6. **Legacy overrides survive migration.** `agents-state.json` values recorded under the original `general-purpose`/`Explore` keys (and the pre-migration `builtInModelOverrides`/`builtInThoughtLevelOverrides` maps) are still imported for every roster name that has them; no existing override is dropped.
7. **Reserved names.** Creating a user or plugin agent named after any built-in is rejected with the reserved-name error.
8. **Same-name user/project override wins.** A user or project profile named like a built-in replaces it in the normalized list; Explore only takes its special read-only path when `source === "built-in"`.
9. **Read-only boundaries.** `Plan`, `Verify`, `CodeReviewer`, and `Debugger` expose no `Write`/`Edit`; `Writer` and `Tester` do.
10. **Installer inclusion.** After `pnpm --filter "@mesa-code/cli..." build`, the compiled `apps/mesa-code-cli/packages/cli/dist/mesa-code.cjs` contains every new built-in name; the check is a grep over the built artifact.

## Runnable checks

- `pnpm typecheck` and `pnpm lint` from the repository root; report real results.
- New tests run with the workspace `tsx`, e.g. `node_modules/.bin/tsx --test apps/mesa-code-cli/packages/core/test/built-in-agents.test.ts` (core roster/override/unknown-type), `packages/services/test/...` (list of eight, reserved names), and `packages/shared/test/...` (override migration for all names).
- Installer inclusion: `pnpm --filter "@mesa-code/cli..." build` then grep `apps/mesa-code-cli/packages/cli/dist/mesa-code.cjs` for `Plan`, `Verify`, `CodeReviewer`, `Debugger`, `Writer`, `Tester`. Full installer creation and installed-runtime verification remain separate and are reported honestly.

## Non-goals

- No change to Explore behavior, the v4 wire protocol, or Quiet Studio Stage 1 UI beyond the model-override capability generalization.
- No agent `.md` files and no plugins are added; these are code-defined built-ins only.
