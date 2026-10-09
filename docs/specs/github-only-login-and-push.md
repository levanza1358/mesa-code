# Settings-only navigation and native Git authentication

**Status:** active specification  
**Owner:** UI, Git, and desktop maintainers  
**Authority:** product and compatibility contract  
**Scope:** Settings-only navigation, application login removal, and native Git push  
**Updated:** 2026-10-09 16:31 (local time)  
**Verification:** source and focused checks are recorded in [`../verification-log.md`](../verification-log.md)

## Product rules

Mesa Code has no application Connect, profile, login, logout, or GitHub OAuth surface. Workspace and Settings sidebars use one full-width Settings button with a gear icon. Settings navigation retains its existing owner and accessible labels. Appearance remains available in Settings; desktop zoom remains available through native commands and shortcuts.

The application opens without an account. Missing model configuration directs users to Model settings. Remove login/welcome rendering, automatic login entry, account restoration in the root UI, and expired-session login prompts. Provider API-key configuration and remote workspace authentication/pairing remain separate features.

GitHub OAuth configuration, adapter registration, token exchange, and the desktop port 8123 callback listener are removed. Existing credential data is not erased or migrated. Stable identifiers retained for legacy credential readability are compatibility-only, never an enabled provider or push credential source.

Commit remains local. Push uses native Git authentication through configured credential helpers or SSH, without application tokens, custom credential injection, or application login requirements. Preserve repository resolution, detached HEAD rejection, remote selection, upstream setup, command limits, and actionable native Git errors. GitHub repository sources, syntax themes, and plugin assets are not account-login features and remain unchanged.

## Ownership and interfaces

- Existing tab/navigation state owns Settings visibility; the footer sends its existing callback.
- Git service owns command admission; GitCliRepo owns repository validation and command construction.
- Git and the operating system own repository authentication. The renderer never handles Git credentials.
- Existing credential storage remains untouched. No new state, persistence, retry, timer, or auth service is introduced.

```text
Footer click -> Settings navigation owner -> Settings view
Push click -> Git service -> GitCliRepo validation
           -> git push -> configured credential helper or SSH
           -> existing result/error projection -> UI
```

## Acceptance scenarios

1. Workspace and Settings footer show a gear and Settings only, without Connect, avatar, account menu, login/logout, plan, or account usage actions. Keyboard activation opens Settings through the existing callback.
2. Startup, missing model, expired legacy credentials, and restored data never render an application login screen. Model configuration remains available.
3. No GitHub OAuth provider is registered. No GitHub callback listener starts. Legacy credentials are not deleted or read for push.
4. A tracking branch executes ordinary `git push`. A branch without upstream executes `git push --set-upstream <remote> <branch>`.
5. Push does not inject a token or override credential helpers. SSH and HTTPS remotes use native Git authentication. Native failure is surfaced; no real external push is required by regression tests.
6. Detached HEAD and missing remote validation remain. Commit behavior, remote workspaces, provider API keys, chat, and permissions remain unchanged.
7. Synthetic command-provider and isolated footer checks verify outcomes. Source tests do not prove a packaged installer or real remote authentication succeeded.

This specification supersedes the former GitHub-only login contract. Verification results are reported separately.
