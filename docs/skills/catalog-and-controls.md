# Skill catalog and controls

**Status:** active reference  
**Owner:** skills service and Settings maintainers  
**Authority:** skill discovery, enablement, and import vocabulary  
**Scope:** local, user, plugin, and imported Agent Skills  
**Updated:** 2026-10-12 08:39 (local time)  
**Verification:** source-only review; no catalog import or runtime discovery was performed

Read the [documentation index](../README.md) first. Read the active skill/subagent specifications for model execution behavior; this document owns catalog and Settings terminology only.

## Behavior

Mesa Code discovers local, user, plugin, and imported Agent Skills. Imported skills come from reviewed public catalogs and remain optional. Users can enable or disable each discovered skill from Settings without deleting it.

## Ownership

`packages/services/src/skills/skillsService.ts` owns skill discovery and enabled state persistence. `packages/ui/src/settings/SkillsSection.tsx` owns the settings interaction, rendered inside the merged Extensions section (`packages/ui/src/settings/PluginsSection.tsx`, mode `skill`). Runtime discovery consumes the persisted enabled state; disabled skills must not enter model skill context.

## Import boundary

Workspace-authored or explicitly copied public skills may live under `.agents/skills`.
The intended import rule remains: import is explicit and does not auto-enable skills.
This document does not establish that a dedicated repository-import command or UI exists.
Review external instructions and bundled scripts before adding them; normal tool
permissions still apply when a loaded skill asks to execute scripts.

Current `skillsService.ts` attaches enabled state by normalized skill path and defaults
an entry without a saved preference to `true`. Consequently, copying a newly discovered
skill is **not** guaranteed to leave it disabled. The intended disabled-by-default
import rule is not established by that discovery path; it needs an explicit
import/enablement decision, not a claim that the source already enforces it.
Plugin enablement and uninstall suppression remain owned by the plugin lifecycle; see
[builtin productivity skills](../specs/builtin-productivity-skills.md).

## Acceptance

- Existing skills remain discoverable.
- Imported public skills appear in Settings.
- Every skill can be enabled or disabled independently.
- Disabled skills remain installed but are absent from the active skill catalog.
- No secret, private repository, or unknown executable is imported.
