// Regression coverage for the non-secure-context crypto fallback.
//
// Symptom: opening the LAN / Tailscale web mirror on a phone over
// `http://<ip>:<port>` crashed the app section with
//   crypto.randomUUID is not a function
// while the same app worked on the desktop (and on the PC browser via
// `http://localhost`).
//
// Cause: `crypto.randomUUID` is only exposed in a secure context (https or
// localhost). A plain-http LAN origin gives the browser `crypto` and
// `crypto.getRandomValues` but NOT `crypto.randomUUID`, and several UI paths call
// `crypto.randomUUID()` directly. `ensureCryptoRandomUuid()` installs a fallback
// at the web entry before the first render.
import assert from "node:assert/strict";
import test from "node:test";
import { ensureCryptoRandomUuid } from "./cryptoRandomUuidPolyfill.js";
import { createUuidFromEntropy } from "./uuid.js";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

test("installs randomUUID when a non-secure crypto has only getRandomValues", () => {
  const insecureCrypto: {
    randomUUID?: () => string;
    getRandomValues: typeof crypto.getRandomValues;
  } = {
    // Simulates the browser shape on a plain-http origin: the object exists and
    // can produce entropy, but the convenience method is absent.
    getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto),
  };

  ensureCryptoRandomUuid({ crypto: insecureCrypto });

  assert.equal(typeof insecureCrypto.randomUUID, "function", "randomUUID must be installed");
  // If the fallback re-entered the patched method it would recurse until the
  // stack overflows; a returned value proves it does not.
  const id = insecureCrypto.randomUUID?.();
  assert.equal(typeof id, "string");
  assert.match(id ?? "", UUID_V4, "the fallback must return a well-formed UUID v4");
});

test("does not touch a crypto that already has a native randomUUID", () => {
  const native = () => "native-id";
  const secureCrypto: { randomUUID?: () => string } = { randomUUID: native };

  ensureCryptoRandomUuid({ crypto: secureCrypto });

  assert.equal(secureCrypto.randomUUID, native, "a secure-context randomUUID must be left as-is");
});

test("is a no-op (and never throws) when crypto is unavailable", () => {
  assert.doesNotThrow(() => ensureCryptoRandomUuid({}));
  assert.doesNotThrow(() =>
    ensureCryptoRandomUuid({ crypto: undefined as unknown as { randomUUID?: () => string } }),
  );
});

test("createUuidFromEntropy never consults crypto.randomUUID", () => {
  // The value must be produced from raw entropy, not by delegating back to the
  // (potentially patched) method, or the polyfill would recurse.
  const id = createUuidFromEntropy();
  assert.match(id, UUID_V4);
});
