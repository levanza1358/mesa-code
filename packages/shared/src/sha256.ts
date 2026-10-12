/**
 * Pure-JS SHA-256 — a drop-in replacement for `crypto.subtle.digest("SHA-256", …)`.
 *
 * `crypto.subtle` is only exposed in a **secure context** (https / localhost).
 * The LAN / Tailscale web mirror opened on a phone over `http://<ip>:<port>` is
 * not one, so `crypto.subtle` is `undefined` there. Callers that need a SHA-256
 * digest — the pptx element-reference fingerprint and the attachment upload
 * checksum — would otherwise throw (`Cannot read properties of undefined`) on
 * that origin. {@link sha256} prefers the native WebCrypto digest and falls back
 * to this implementation, so the mirror behaves the same as localhost.
 *
 * The implementation is deliberately dependency-free (no `@noble/hashes`): it is
 * verified against the FIPS 180-4 test vectors in the co-located test.
 */

// SHA-256 round constants: the first 32 bits of the fractional parts of the cube
// roots of the first 64 primes (FIPS 180-4 §4.2.2).
const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

// Initial hash values: the first 32 bits of the fractional parts of the square
// roots of the first 8 primes (FIPS 180-4 §5.3.3).
const SHA256_H = new Uint32Array([
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
]);

function rotr(value: number, bits: number): number {
  return (value >>> bits) | (value << (32 - bits));
}

/** SHA-256 of `data`, returned as 32 raw bytes. */
export function sha256Bytes(data: Uint8Array): Uint8Array {
  const length = data.length;
  // Pad: append 0x80, zeros, then the 64-bit big-endian message length in bits,
  // so the total is the smallest multiple of 64 covering length + 1 + 8.
  let paddedLength = length + 1 + 8;
  if (paddedLength % 64 !== 0) {
    paddedLength += 64 - (paddedLength % 64);
  }
  const padded = new Uint8Array(paddedLength);
  padded.set(data);
  padded[length] = 0x80;

  const paddedView = new DataView(padded.buffer);
  const bitLength = length * 8;
  paddedView.setUint32(paddedLength - 8, Math.floor(bitLength / 0x1_0000_0000));
  paddedView.setUint32(paddedLength - 4, bitLength >>> 0);

  const state = SHA256_H.slice();
  const schedule = new Uint32Array(64);

  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let index = 0; index < 16; index += 1) {
      schedule[index] = paddedView.getUint32(offset + index * 4);
    }
    for (let index = 16; index < 64; index += 1) {
      const w15 = schedule[index - 15]!;
      const w2 = schedule[index - 2]!;
      const s0 = rotr(w15, 7) ^ rotr(w15, 18) ^ (w15 >>> 3);
      const s1 = rotr(w2, 17) ^ rotr(w2, 19) ^ (w2 >>> 10);
      schedule[index] = (schedule[index - 16]! + s0 + schedule[index - 7]! + s1) >>> 0;
    }

    let a = state[0]!;
    let b = state[1]!;
    let c = state[2]!;
    let d = state[3]!;
    let e = state[4]!;
    let f = state[5]!;
    let g = state[6]!;
    let h = state[7]!;

    for (let index = 0; index < 64; index += 1) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + SHA256_K[index]! + schedule[index]!) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    state[0] = (state[0]! + a) >>> 0;
    state[1] = (state[1]! + b) >>> 0;
    state[2] = (state[2]! + c) >>> 0;
    state[3] = (state[3]! + d) >>> 0;
    state[4] = (state[4]! + e) >>> 0;
    state[5] = (state[5]! + f) >>> 0;
    state[6] = (state[6]! + g) >>> 0;
    state[7] = (state[7]! + h) >>> 0;
  }

  const digest = new Uint8Array(32);
  const digestView = new DataView(digest.buffer);
  for (let index = 0; index < 8; index += 1) {
    digestView.setUint32(index * 4, state[index]!);
  }
  return digest;
}

function toBytes(value: Uint8Array | ArrayBuffer | string): Uint8Array {
  if (typeof value === "string") {
    return new TextEncoder().encode(value);
  }
  return value instanceof Uint8Array ? value : new Uint8Array(value);
}

export function sha256Hex(value: Uint8Array | ArrayBuffer | string): string {
  const digest = sha256Bytes(toBytes(value));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * SHA-256 via the native WebCrypto digest when it is available (secure context),
 * otherwise the pure-JS implementation. Use this instead of calling
 * `crypto.subtle.digest` directly so the same code path works on the non-secure
 * LAN mirror.
 */
export async function sha256(value: Uint8Array | ArrayBuffer | string): Promise<Uint8Array> {
  const bytes = toBytes(value);
  const subtle = globalThis.crypto?.subtle;
  if (subtle && typeof subtle.digest === "function") {
    try {
      const digest = await subtle.digest("SHA-256", bytes as unknown as BufferSource);
      return new Uint8Array(digest);
    } catch {
      // Fall through to the pure-JS path rather than failing the caller.
    }
  }
  return sha256Bytes(bytes);
}
