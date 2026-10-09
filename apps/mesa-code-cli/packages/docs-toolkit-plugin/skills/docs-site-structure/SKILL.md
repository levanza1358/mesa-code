---
name: docs-site-structure
description: Plan and organize a documentation site's information architecture and navigation using the project's existing documentation tooling.
---

# Docs site structure

## Establish scope
- Confirm audience, the questions the site must answer, and the existing stack.
- Read the current docs directory, config, navigation files, and build scripts first.
- Follow the repository's documentation conventions and CMS or generator in use.
- Update the corresponding spec before changing documented behavior.
- Preserve unrelated files, existing pages, and user-authored content.

## Design the structure
- Group content by user task and concept, not by internal code layout.
- Define a shallow, predictable navigation with clear top-level sections.
- Give each page a single purpose, a descriptive title, and stable URL slug.
- Order onboarding, how-to, reference, and explanation content coherently.
- Keep terminology consistent with the product and avoid duplicate pages.
- Plan redirects or aliases when moving or renaming existing pages.
- Use only the generator, theme, and dependencies the project already provides.
- Do not invent a static-site engine or CMS that is not present.

## Verify and deliver
- Confirm the site builds with the project's actual command where available.
- Check that internal links, navigation entries, and slugs resolve.
- Note pages created as stubs versus those fully written.
- Report any build or preview step that could not be run and why.
- Ask permission before publishing, deploying, or committing the site.
