---
name: native-permissions
description: Review and design mobile permission usage with just-in-time prompts, accurate disclosure, and denial-safe behavior on native and web targets.
---

# Native permissions

## Map the requirements
- Identify each capability in scope (camera, microphone, location, photos, notifications, contacts, Bluetooth) and the exact feature that needs it.
- Read the platform manifest and configuration files to see what is currently declared and requested.
- Distinguish permissions declared at build time from those requested at runtime, and note background versus foreground scope.
- Check platform and store policy wording for the capability; do not assume a permission is allowed merely because the API exists.
- Use platform-native APIs and existing project dependencies; do not invent a permission plugin.

## Design honest, minimal requests
- Request the smallest scope that satisfies the feature; never request broad or background access "just in case".
- Trigger the system prompt at the moment of need, after a short in-app explanation, not on first launch.
- Write user-facing purpose strings in plain language stating what is accessed and why; keep them accurate to real use.
- Make denial, limited, and restricted states first-class: degrade gracefully and keep unrelated features working.
- Provide a path to settings when a hard requirement is unmet, without nagging or blocking unrelated tasks.
- Handle revocation mid-session and re-check state before each use rather than caching a stale grant.
- Keep permission state owned in one place; avoid duplicate request paths that race the same prompt.
- Never store or log sensitive permission-derived data; keep user data out of logs and examples.

## Verify and report
- Confirm the declared manifest entries match what the code actually requests and uses.
- Test grant, deny, limited, and revoke paths where the environment allows; report what could not be exercised.
- State clearly when no device, emulator, or store review was performed.
- Report each capability, its justification, the request timing, and any policy risk found.
