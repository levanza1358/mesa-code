# Custom-provider-only model settings

**Status:** active  
**Owner:** Model settings maintainers  
**Authority:** contract  
**Scope:** custom-provider-only Settings surface without deleting legacy provider data  
**Updated:** 2026-10-12 08:39 (local time)  
**Verification:** source-only documentation review; provider Apply/Test limitations are tracked in its linked contract

## Product behavior

The Model settings page is focused on user-managed custom providers.

- The provider list shows only saved custom providers.
- Add provider opens the custom-provider creation flow directly.
- Built-in account providers, Start Plan entries, coding-plan controls, subscription cards, upgrade actions, usage entitlement panels, and provider login/logout actions are not rendered.
- Existing custom provider configuration, editing, deletion, connection mode, and model selection behavior remain available.
- Editing a provider's **Base URL** or **API key** is explicit: the value stays a draft until **Apply** is pressed, and **Test connection** becomes available after Apply. See [custom provider connection apply and test](custom-provider-connection-apply-and-test.md).
- If no custom providers exist, the page shows an English empty state with an Add provider action.
- Existing persisted built-in provider settings are ignored by this UI migration; they are not deleted automatically.

## Ownership and boundary

`ModelProviderSection` remains the single UI owner for provider-page selection and creation state. Existing provider services remain the owner of persistence and connectivity. The UI sends the existing custom-provider commands and does not add a second persistence path.

## Acceptance scenarios

1. Opening Model settings displays no subscription, plan, billing, usage, or account-provider content.
2. Clicking Add provider opens the custom-provider form without a built-in template picker.
3. Saving a custom provider adds it to the provider list and allows normal configuration.
4. Existing custom providers can still be selected and edited.
5. The page and all newly exposed copy are English.
