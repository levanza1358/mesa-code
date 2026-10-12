import { createUuidFromEntropy } from "./uuid.js";

/**
 * Minimal host shape for {@link ensureCryptoRandomUuid}: an object that may carry
 * a `crypto` with an optional `randomUUID`. Typed structurally so a test can pass
 * a plain stub instead of the real global.
 */
export interface CryptoRandomUuidHost {
  crypto?: { randomUUID?: () => string };
}

/**
 * Ensures `crypto.randomUUID()` exists before the app renders.
 *
 * `crypto.randomUUID` is only exposed in a **secure context** — `https://` or
 * `http://localhost`. A browser that opens the LAN / Tailscale mirror on a phone
 * via `http://<ip>:<port>` is **not** a secure context: `crypto` and
 * `crypto.getRandomValues` exist, but `crypto.randomUUID` does not. Any UI path
 * that calls `crypto.randomUUID()` directly (notification pills, telemetry ids,
 * the hooks store, upload transactions, …) then throws
 * `crypto.randomUUID is not a function` and takes its section down with an error
 * boundary — which is exactly the first-paint failure seen on a phone mirror.
 *
 * `createUuidFromEntropy` (in `./uuid.js`) already degrades gracefully across
 * every other crypto entry point, and — importantly — never calls
 * `crypto.randomUUID` itself, so delegating to it cannot recurse once the method
 * is patched. Installing one fallback that delegates to it fixes all such call
 * sites at once, so the mirror works over plain HTTP without each caller
 * re-implementing a guard. Node and secure-context browsers already have
 * `randomUUID`, so this is a no-op there.
 *
 * Call this once, before the first render, from the non-secure-context entry
 * (the web client entry).
 */
export function ensureCryptoRandomUuid(
  host: CryptoRandomUuidHost = globalThis as unknown as CryptoRandomUuidHost,
): void {
  const runtimeCrypto = host.crypto;
  // No crypto at all, or a native randomUUID: nothing to patch. `createUuid`
  // already falls back on its own when `crypto` is entirely absent.
  if (!runtimeCrypto || typeof runtimeCrypto.randomUUID === "function") {
    return;
  }

  try {
    Object.defineProperty(runtimeCrypto, "randomUUID", {
      value: () => createUuidFromEntropy(),
      configurable: true,
      writable: true,
    });
  } catch {
    // A frozen crypto object cannot be patched. The common paths all funnel
    // through the guarded `createUuid`, so leaving it is the safe choice rather
    // than throwing out of a bootstrap step.
  }
}
