# File authoring guidance

Status: Implemented

## Problem

The agent refused to create plain-text files such as `.csv` when the request was not a
coding task, claiming the tool could not do it. The refusal was wrong: the `Write` tool
accepts any text content and performs no extension validation; the path policy does not
block paths outside the workspace root. Only the `Read` tool has a binary-extension
denylist, and it does not include `.csv`.

The real gap is in guidance, not capability:

- No prompt text states which file formats can be written directly as text and which
  require a generator program.
- The `Write` tool description only talks about "files" without saying that the same tool
  handles non-code deliverables (documents, data, config).
- Nothing tells the agent to check a command/file actually exists before reporting it as
  unavailable.

## Product behavior

The agent must treat file authoring as a general capability, not a coding-only one.

1. **Direct text writing.** Formats that are plain text are written with the `Write`
   tool by passing the content as a string. Examples: `.csv`, `.md`, `.json`, `.txt`,
   `.html`, `.svg`, `.yaml`, `.xml`, and source code. No shell command and no script is
   required.
2. **Generated binary writing.** Formats that are binary containers are produced by
   running a program through the `Bash` tool (a language runtime, a CLI, or an installed
   library). Examples: `.xlsx`, `.docx`, `.pdf`, `.png`, `.zip`. `Write` cannot emit these
   bytes directly.
3. **No capability refusal without evidence.** Before telling the user that a file cannot
   be produced, the agent must attempt the direct `Write` path for text formats, or verify
   that a needed interpreter/binary is missing for binary formats. A format is never
   assumed unsupported just because it is not code.

## Where the guidance lives

The guidance is delivered through the existing prompt surfaces. No new runtime state, no
new tool, and no new persistence path is introduced.

- **Tool descriptions** (per-tool, closest to the model's decision):
  - `Write` provider description names direct text authoring and gives non-code examples.
  - `Bash` provider description notes that it produces binary/office artifacts whose bytes
    `Write` cannot emit, so the model does not try to hand-write them and does not refuse.
- **Identity section** (`# Harness`): one line stating that non-code deliverables are in
  scope and that direct text writing needs no shell command.
- **Binary Read denylist message**: points at the correct alternative (render an image
  visually, or process the binary through `Bash`) instead of leaving the model without a
  next step.

## Ownership and boundary

- The `Write` and `Bash` tool entries own their own provider descriptions
  (`apps/mesa-code-cli/packages/core/src/tool/handlers/write.ts`,
  `.../handlers/bash-prompt.ts`). One owner per description, no duplication.
- The identity section (`apps/mesa-code-cli/packages/core/src/context/sections/identity.ts`)
  owns the harness-level line. It applies to both the interactive identity and the
  workflow-actor identity through the shared `buildHarnessBlock`.
- The `Read` contract (`apps/mesa-code-cli/packages/contracts/src/tools/read.ts`) owns the
  binary-extension denylist and its message.
- No code-level extension allow/deny list is added to `Write`: the current behavior
  (accept any text) is correct, and adding a denylist would create the very refusal this
  spec removes.

## Acceptance scenarios

1. "Create a CSV file with these rows" is fulfilled with a single `Write` call; no shell
   command is run.
2. "Create an Excel `.xlsx` file" is fulfilled by running a generator through `Bash`;
   the agent does not attempt to hand-write the archive bytes and does not refuse.
3. The agent does not claim a text format is unsupported without first attempting `Write`.
4. `Write`'s provider description mentions non-code deliverables (documents/data) and
   states that plain-text formats need no script.
5. `Bash`'s provider description explains it is the path for binary/office artifacts.
6. The `# Harness` line states that non-code deliverables are in scope and that direct
   text writing needs no shell command.
7. Reading a genuinely binary file (e.g. `.zip`) still returns the binary-extension
   error, and the message points at a usable alternative.
8. The workflow-actor identity keeps the same harness line (shared `buildHarnessBlock`).
