import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

/**
 * Coverage for the custom provider connection Apply/Test flow.
 *
 * Product rules (docs/specs/custom-provider-connection-apply-and-test.md):
 * Base URL and API key are draft-only while typing; Apply is the only writer; Test
 * is a manual action available only once the draft is applied.
 *
 * Before this change the connection fields auto-saved on blur and on an idle
 * timer, so a partially typed Base URL or API key could be persisted and each
 * blur could fire provider work.
 */

const cardSource = readFileSync(
  resolve(
    import.meta.dirname,
    "..",
    "src",
    "settings",
    "model-provider-section",
    "InlineEditableProviderCard.tsx",
  ),
  "utf8",
);

const sectionSource = readFileSync(
  resolve(
    import.meta.dirname,
    "..",
    "src",
    "settings",
    "model-provider-section",
    "ProviderCardSections.tsx",
  ),
  "utf8",
);

test("connection fields no longer schedule an idle save", () => {
  // The idle trigger is cancelled during Apply/cleanup, but nothing may schedule
  // it: scheduling is what produced the implicit write.
  assert.equal(
    cardSource.includes("scheduleIdleDraftSave"),
    false,
    "connection fields must not schedule an idle draft save",
  );
});

test("the Base URL field is not wired to a blur save", () => {
  assert.equal(
    cardSource.includes("onBaseUrlBlur={saveConnection}"),
    false,
    "Base URL must not save on blur",
  );
  assert.equal(
    cardSource.includes("const saveConnection"),
    false,
    "the blur-save helper must be removed",
  );
});

test("API key blur performs no save", () => {
  // The handler may exist for the field contract, but it must not commit.
  const match = cardSource.match(/const handleApiKeyBlur = useCallback\(\(\) => \{([\s\S]*?)\}, \[\]\);/);
  assert.ok(match, "expected the api key blur handler");
  assert.equal(
    /commitPendingDraft/.test(match[1]),
    false,
    "api key blur must not commit the draft",
  );
});

test("Apply commits the draft and is the only connection writer", () => {
  assert.match(
    cardSource,
    /const handleApplyConnection = useCallback\(async \(\) => \{[\s\S]*?await commitPendingDraft\("connection-apply"\)/,
    "Apply must commit through the existing draft save path",
  );
});

test("Test runs the existing connectivity test and never implicitly", () => {
  assert.match(
    cardSource,
    /const handleTestConnection = useCallback\(async \(\) => \{[\s\S]*?await onTestModel\(provider\.providerId, modelId\)/,
    "Test must call the existing connectivity test",
  );
});

test("Apply and Test expose stable test ids and gate each other", () => {
  assert.match(cardSource, /data-testid="provider-connection-apply"/);
  assert.match(cardSource, /data-testid="provider-connection-test"/);
  // Apply requires a dirty draft; Test requires a clean one.
  assert.match(
    cardSource,
    /data-testid="provider-connection-apply"[\s\S]{0,400}?disabled=\{applyingConnection \|\| !connectionDraftDirty\}/,
    "Apply must be disabled without a dirty draft",
  );
  assert.match(
    cardSource,
    /data-testid="provider-connection-test"[\s\S]{0,400}?disabled=\{connectionDraftDirty \|\| applyingConnection \|\| testingConnection\}/,
    "Test must be disabled while the draft is unapplied",
  );
});

test("Test reports every outcome instead of failing silently", () => {
  // A clean run must set the passed flag; a failure must set the error. Without
  // this the click looked like a dead button.
  assert.match(
    cardSource,
    /const handleTestConnection = useCallback\(async \(\) => \{[\s\S]*?setTestingConnection\(true\)/,
    "Test must enter a visible running state",
  );
  assert.match(
    cardSource,
    /if \(result\.success\) \{\s*setConnectionTestPassed\(true\);/,
    "a successful Test must report success",
  );
  assert.match(cardSource, /data-testid="provider-connection-test-passed"/);
  assert.match(
    cardSource,
    /settings\.modelProvider\.connection\.testing/,
    "the running state must use a dedicated label",
  );
});

test("Test falls back to the provider catalog when no model is selected", () => {
  // The connectivity service needs a persisted ModelSelection, so a provider
  // with no models yet is still testable via its own /models endpoint.
  assert.match(
    cardSource,
    /const discovered = await onDiscoverModels\(provider\.providerId\)/,
    "Test must fall back to the provider catalog",
  );
});

test("connection error is surfaced inline", () => {
  assert.match(cardSource, /data-testid="provider-connection-error"/);
});

test("the connection section accepts an optional blur handler", () => {
  assert.match(
    sectionSource,
    /onBaseUrlBlur\?: \(\) => void;/,
    "onBaseUrlBlur must be optional because callers no longer save on blur",
  );
});
