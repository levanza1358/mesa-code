# Custom provider connection apply and test

**Status:** active  
**Owner:** Model settings maintainers  
**Authority:** contract  
**Scope:** Base URL and API key editing on the custom provider card  
**Updated:** 2026-10-12 08:39 (local time)  
**Verification:** source-only review; Apply-only contract mismatches remain below

## Product behavior

Editing a custom provider's connection fields must be an explicit, two-step
action instead of saving on blur.

1. **Draft only while typing.** Changing **Base URL** or **API key** updates the
   local draft. It does not persist provider configuration and does not trigger
   any network request.
2. **Apply is the only writer.** An **Apply** action appears once the connection
   draft differs from the saved provider config. Pressing it commits the draft
   through the existing provider save path — the same single owner used today.
   Apply is disabled while a commit is in flight.
3. **Test is manual and follows Apply.** After the draft is applied, a **Test
   connection** action becomes available. Pressing it runs the existing model
   connectivity test against the applied configuration and reports success or a
   failure message inline. Test never runs implicitly on typing, on blur, or as a
   side effect of Apply.
   - Because the connectivity service requires a persisted model selection, a
     provider with no models yet is probed through its own `/models` endpoint
     instead. Both paths prove the Base URL and credential are reachable.
   - Test always reports an outcome: a running state while it works, a success
     message, or a failure message. A silent success is a defect.
4. **Test requires an applied configuration.** While the connection draft is
   dirty, Test is unavailable, because it would otherwise test unsaved values.
5. **No silent network traffic.** Typing in Base URL or API key must not produce
   provider requests. Only Apply writes, and only Test reads against the provider.
6. **Failure is reported, not hidden.** A failed Apply or Test leaves the draft
   intact and shows the error inline; the saved configuration is unchanged on a
   failed Apply.
7. **Unchanged fields keep today's behavior.** Provider name, API format, model
   list, model editing, and discovery keep their existing commit rules. This
   change covers the connection fields (Base URL, API key) only.

## Why

Auto-saving on blur meant a partially typed Base URL or API key could be
persisted, and each blur could fire provider work. Users could not tell whether a
value had been saved, and there was no deliberate way to check whether the
credentials actually work before relying on them.

## State owner

- `InlineEditableProviderCard` owns the connection draft, the dirty flag, and the
  Apply/Test action state. It stays the single UI owner for the card's draft.
- The existing provider save path remains the only writer of provider config.
- The existing connectivity service remains the only connectivity tester; this
  change adds no new network path, persistence path, or service.

## Interface

```text
connection draft (Base URL, API key)
  -> dirty?            -> Apply enabled
  -> Apply pressed     -> existing provider save -> draft becomes clean, Test enabled
  -> Test pressed      -> existing connectivity test -> inline result
```

Apply and Test expose stable identifiers so interaction coverage can address them.

## Current source and verification boundary

The rules above remain the desired contract, not a completion claim.
[`InlineEditableProviderCard.tsx`](../../packages/ui/src/settings/model-provider-section/InlineEditableProviderCard.tsx)
owns draft/action state and calls `commitPendingDraft` for Apply. The source also
calls that helper from name blur, API-format changes, cleanup, and per-model
connectivity testing; provider enable/disable builds a save from the pending draft.
These paths can include unsaved connection fields. Apply is therefore **not yet the
exclusive connection writer** despite the source comments and focused test name.
Do not relax rule 2 to accept these implicit saves.

The source renders Apply even when clean (disabled), rather than showing it only
when dirty as rule 2 requires. Test is enabled for a clean saved configuration
without requiring an Apply in the current mount. A successful model test checks
`models[0]` through `onTestModel`; without a usable model/test callback it falls
back to `onDiscoverModels`. A successful catalog read proves that endpoint answered,
not that a model-generation request or all credentials/capabilities will work.

The existing service paths are
[`providerSettingsConnectivity.ts`](../../packages/services/src/model-provider/providerSettingsConnectivity.ts)
and [`modelDiscoveryExecutor.ts`](../../packages/services/src/model-provider/modelDiscoveryExecutor.ts).
Discovery is also a deliberate provider read: rule 5 forbids implicit traffic from
connection editing, not the separate [Fetch models](custom-provider-model-discovery.md)
action retained by rule 7.

`packages/ui/test/providerConnectionApplyTest.test.ts` checks source patterns; it
is not an interaction test and does not cover the other save paths above. A future
isolated interaction check must type a draft, blur, rename, change API format,
toggle the provider, switch providers/unmount, and run a model test while observing
config writes and provider requests. Then check Apply failure, Test failure, a
provider with no models, and stale success feedback after edits. Do not capture
API keys or real provider response bodies in evidence.

## Acceptance scenarios

1. Typing a Base URL or API key issues no provider request and writes no config.
2. Apply appears only when the connection draft differs from the saved config, and
   is disabled while committing.
3. Pressing Apply persists the draft through the existing save path and clears the
   dirty state.
4. Test is unavailable while the draft is dirty and becomes available once the
   draft is applied.
5. Pressing Test runs the existing connectivity test and shows a success or failure
   message without changing saved configuration. When the provider has no models
   yet, Test still probes reachability and reports an outcome.
6. A failed Apply reports inline and leaves the previously saved configuration in
   place.
7. Blurring a connection field performs no implicit save.
8. Test shows a running state while it works, so a press is always visibly
   acknowledged.
