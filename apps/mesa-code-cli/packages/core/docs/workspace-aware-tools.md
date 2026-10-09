# Workspace-aware model tools

## Behavior

Model tools are exposed only when the active context is inside a detected Git workspace. Outside a workspace, model requests receive no tools; the model can still answer text questions.

## Owner and boundary

`AgentRuntime.getTools` owns provider-visible tool exposure. It reads `config.envInfo.isGitRepository`, which is populated by the context-source adapter from the active working directory. Tool execution remains unchanged; unavailable tools cannot be requested.

## Acceptance

- Git workspace: existing tool set remains available.
- Non-workspace directory: `getTools()` returns an empty list.
- Text-only model requests continue without tool definitions.
- Switching context refreshes environment state before the next request.
