// Coverage for the dependency-free SHA-256 that backs the non-secure-context
// digest fallback.
//
// Symptom (same class as cryptoRandomUuidPolyfill.test.ts): on the plain-http LAN
// web mirror opened on a phone, `crypto.subtle` is undefined, so any path hashing
// content for an element-reference fingerprint or an attachment checksum threw.
// `packages/shared/src/sha256.ts` supplies a pure-JS digest that needs no
// dependency (`@noble/hashes` is only a transitive package and cannot be imported
// directly) and is verified here against the FIPS 180-4 vectors and against
// Node's own `crypto` over random inputs, so a future edit to the round function
// cannot silently corrupt the hash.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { sha256, sha256Bytes, sha256Hex } from "./sha256.js";

// FIPS 180-4 / NIST example vectors.
const VECTORS: ReadonlyArray<readonly [string, string]> = [
  ["", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"],
  ["abc", "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"],
  [
    "abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq",
    "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1",
  ],
  [
    "abcdefghbcdefghicdefghijdefghijkefghijklfghijklmghijklmnhijklmnoijklmnopjklmnopqklmnopqrlmnopqrsmnopqrstnopqrstu",
    "cf5b16a778af8380036ce59e7b0492370b249b11e8f07a51afac45037afee9d1",
  ],
];

test("sha256Hex matches the FIPS 180-4 vectors", () => {
  for (const [input, expected] of VECTORS) {
    assert.equal(sha256Hex(input), expected, `sha256 of ${JSON.stringify(input.slice(0, 16))}…`);
  }
});

test("the empty message produces the canonical digest as raw bytes", () => {
  const digest = sha256Bytes(new Uint8Array(0));
  assert.equal(digest.length, 32);
  assert.equal(
    Buffer.from(digest).toString("hex"),
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  );
});

test("a one-million-'a' message hashes correctly (multi-block padding path)", () => {
  const input = new Uint8Array(1_000_000).fill(0x61);
  assert.equal(
    sha256Hex(input),
    "cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0",
  );
});

test("sha256Hex equals Node's crypto over every message-length padding case", () => {
  // Sweep 0..129 bytes plus a couple of larger sizes: this crosses both the
  // 55/56-byte single/two-block boundary and the 64-byte block boundary, which is
  // where a padding bug hides.
  const lengths = [...Array.from({ length: 130 }, (_, index) => index), 200, 1000, 4096];
  for (const length of lengths) {
    const bytes = new Uint8Array(length);
    for (let index = 0; index < length; index += 1) {
      bytes[index] = (index * 31 + 7) & 0xff;
    }
    const expected = createHash("sha256").update(Buffer.from(bytes)).digest("hex");
    assert.equal(sha256Hex(bytes), expected, `length ${length}`);
  }
});

test("sha256 prefers WebCrypto when present and matches the pure-JS digest", async () => {
  // On this Node runtime `crypto.subtle` exists, so this exercises the native
  // branch; it must agree byte-for-byte with the fallback used off-localhost.
  const input = new TextEncoder().encode("mesa-code");
  const viaHelper = await sha256(input);
  const viaFallback = sha256Bytes(input);
  assert.deepEqual([...viaHelper], [...viaFallback]);
});

test("sha256 accepts strings, ArrayBuffer and Uint8Array alike", async () => {
  const expected = sha256Hex("hello");
  assert.equal(sha256Hex(new TextEncoder().encode("hello")), expected);
  const buffer = new TextEncoder().encode("hello").buffer;
  assert.equal(sha256Hex(buffer), expected);
  assert.equal(Buffer.from(await sha256("hello")).toString("hex"), expected);
});
