# Builtin productivity skills and installer delivery

## Product rules

Mesa Code expands its builtin plugin catalog with curated first-party skill packs for development, quality, documents, data, and project operations. This request is a bounded addition beyond Quiet Studio's presentation stage: it does not redesign plugin settings or restore removed marketplace modules. Use the current builtin packaging and seeding interfaces.

The catalog grows in deliberate waves. A later wave adds six more instruction packs in distinct areas that existing packs do not already cover: testing strategy, documentation site work, database and schema work, mobile platforms, cloud and operations, and AI/agent engineering. New skills must not duplicate an existing skill name, and each must name the concrete artifacts and verification it expects. Waves are additive only; existing pack IDs, versions, and skill names stay stable so saved user preferences and suppression still resolve.

New packs contain reusable instructions backed by tools the current Agent already exposes. They do not invent capabilities, require undisclosed accounts, download executable code on activation, or auto-enable external services. Existing runtime-bearing plugins and their runtime verification remain unchanged. Skills must inspect project conventions, preserve user changes, verify results proportionately, respect security/permission boundaries, and accurately report unavailable tools. Office/binary deliverables use existing available libraries/runtime tooling rather than promising unavailable converters.

## Owner and interface

The existing builtin catalog and bundle manifest own the shipped plugin definitions. Existing package scripts assemble builtin resources into the Agent/Desktop installer. Existing plugin service owns seeding, enable/disable, restore, and persisted suppression; no new lifecycle write path is added. Manifest IDs, plugin directories, marketplace/storage/protocol identifiers stay compatible.

```text
Builtin manifest + skill instructions
  => existing bundle staging => installer resources
  => existing plugin seed adapter => Official Marketplace builtin lifecycle
  => existing skill discovery => Agent tools and permission admission
```

Existing user-uninstalled builtins must remain suppressed on restart. New packs follow the same seed/default behavior as other supported builtins; they must not overwrite user-authored skills or personal plugin data. No credentials or real user data belong in packages or examples.

## Acceptance scenarios

1. Build staging contains every declared plugin manifest and every referenced SKILL.md, with unique IDs, safe in-bundle paths, valid frontmatter, English instructions, and no dangling runtime executable references.
2. A fresh isolated plugin registry discovers the new skill packs through the existing builtin path. Existing suppressed/uninstalled packs are not silently restored.
3. Pack summaries state actual capabilities and tool/dependency limits. Security review is defensive and authorized only; workflows do not publish, delete, deploy, or commit without authorization.
4. Installer configuration includes the same staged resources, with an executable check that fails for missing assets. Source/staging validation, full installer creation, and installed runtime validation are reported separately.
5. Existing typecheck/lint and available catalog/seed tests pass, or actual failures are reported without deleting unrelated code/data.
6. The later wave adds 24 more skills across testing-strategy, docs-site, database, mobile, cloud-ops, and ai-engineering packs; every name is unique across the whole catalog, light and dark UI still lists them in Extensions, and manual disable/uninstall suppression keeps working per pack.

## Runnable checks

- `node scripts/check-builtin-productivity.mjs` validates the six manifests, 24 English skills, unique IDs, safe in-bundle paths, and the release asset manifest produced by the existing SEA collector.
- `node scripts/check-builtin-productivity.mjs --desktop` additionally compares the staged `bundled-agents/<platform>/glm/packages/*-plugin` copies with their sources after `pnpm --filter @mesa-code/desktop prepare:agent-bundle`.
- `pnpm exec tsx scripts/check-builtin-productivity-discovery.mjs` runs real plugin discovery: all six packs load and are enabled by the existing default set, an explicit disable keeps the plugin visible but disabled, and a persisted uninstall suppression removes it from discovery.

- With `pnpm dev:desktop` serving current renderer and desktop artifacts, `node scripts/check-builtin-extensions-e2e.mjs` opens a separate isolated Electron profile, selects Extensions User scope, refreshes Skills, and asserts all 26 visible skill names (24 toolkit skills plus 2 Browser Use skills). It also verifies the eight-plugin inventory and captures a screenshot under `.quiet-studio-runtime/builtin-checks`. It does not change the active user's plugin configuration.

These checks cover source, staging, discovery, and the development Extensions UI. Full installer creation and installed-runtime verification remain separate and are reported honestly.
