# Custom-provider-only model settings

Status: Implemented

## Product behavior

The Model settings page is focused on user-managed custom providers.

- The provider list shows only saved custom providers.
- Add provider opens the custom-provider creation flow directly.
- Built-in account providers, Start Plan entries, coding-plan controls, subscription cards, upgrade actions, usage entitlement panels, and provider login/logout actions are not rendered.
- Existing custom provider configuration, editing, deletion, connection mode, and model selection behavior remain available.
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
