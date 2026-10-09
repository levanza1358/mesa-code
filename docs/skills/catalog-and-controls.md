# Skill catalog and controls

**Status:** active reference  
**Owner:** skills service and Settings maintainers  
**Authority:** skill discovery, enablement, and import vocabulary  
**Scope:** local, user, plugin, and imported Agent Skills  
**Updated:** 2026-10-09 16:31 (local time)

Read the [documentation index](../README.md) first. Read the active skill/subagent specifications for model execution behavior; this document owns catalog and Settings terminology only.

## Behavior

Mesa Code discovers local, user, plugin, and imported Agent Skills. Imported skills come from reviewed public catalogs and remain optional. Users can enable or disable each discovered skill from Settings without deleting it.

## Ownership

`packages/services/src/skills/skillsService.ts` owns skill discovery and enabled state persistence. `packages/ui/src/settings/SkillsSection.tsx` owns the settings interaction, rendered inside the merged Extensions section (`packages/ui/src/settings/PluginsSection.tsx`, mode `skill`). Runtime discovery consumes the persisted enabled state; disabled skills must not enter model skill context.

## Import boundary

Public skill repositories are imported into the workspace `.agents/skills` directory. Import is explicit and does not auto-enable skills. Imported `SKILL.md` files are treated as instructions, not executable code; bundled scripts still require normal tool permissions.

## Acceptance

- Existing skills remain discoverable.
- Imported public skills appear in Settings.
- Every skill can be enabled or disabled independently.
- Disabled skills remain installed but are absent from the active skill catalog.
- No secret, private repository, or unknown executable is imported.
