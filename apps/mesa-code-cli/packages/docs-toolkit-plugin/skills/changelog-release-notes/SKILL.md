---
name: changelog-release-notes
description: Produce changelog and release notes from verified repository changes, grouped by impact and with honest breaking-change callouts.
---

# Changelog and release notes

## Gather verified changes
- Confirm the release range, version, audience, and changelog format in use.
- Read commit history, merged changes, tags, and the existing changelog file.
- Follow the repository's changelog conventions and Keep a Changelog style if present.
- Update the corresponding spec before changing documented behavior.
- Preserve prior entries and unrelated edits; never rewrite shipped history.

## Summarize by impact
- Group entries under Added, Changed, Fixed, Deprecated, Removed, and Security.
- Write each entry from the user's perspective, not the raw commit message.
- Include issue or pull-request references the repository actually uses.
- Call out breaking changes, migrations, and required actions prominently.
- Distinguish user-visible behavior changes from internal refactors.
- Omit noise such as formatting-only or dependency-bump commits when convention allows.
- Avoid inventing features, dates, or fixes not present in the changes.

## Verify and deliver
- Cross-check that each entry maps to a real change in the range.
- Confirm the version, date, and links resolve and match the project scheme.
- Report any change whose user impact could not be confirmed from the source.
- Ask permission before tagging, publishing, or committing the release.
