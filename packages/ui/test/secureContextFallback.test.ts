// Regression coverage for the non-secure-context fallbacks in the web shell.
//
// `crypto.subtle` and `navigator.clipboard` are secure-context-only APIs: they are
// absent when the LAN web mirror is opened on a phone over `http://<ip>:<port>`.
// (The first member of this family, `crypto.randomUUID`, is covered by
// packages/ui/test/mobileWebLayout.test.ts's sibling in shared: sha256.test.ts.)
// These tests read the source and pin every call site we rely on, so a future edit
// cannot reintroduce a direct, unguarded use that would throw on that origin.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const uiSrc = (...parts: string[]): string =>
  readFileSync(resolve(import.meta.dirname, "..", "src", ...parts), "utf8");

const pptxSource = uiSrc("lib", "pptxElementReference.ts");
const uploadSource = uiSrc("v4", "attachmentUploadTransaction.ts");
const terminalSource = uiSrc("terminal", "TerminalSession.tsx");
const toolLayoutSource = uiSrc("ToolCallBlocks", "ToolLayout.tsx");
const sidebarItemSource = uiSrc("WorkspaceSidebarItem.tsx");

test("the pptx fingerprint routes through the shared SHA-256 helper", () => {
  assert.equal(
    pptxSource.includes("globalThis.crypto.subtle"),
    false,
    "the pptx fingerprint must not touch crypto.subtle directly (secure-context-only)",
  );
  assert.ok(
    pptxSource.includes('import { sha256 } from "@mesa-code/shared"'),
    "the pptx fingerprint must import the shared sha256 helper",
  );
  assert.match(
    pptxSource,
    /const digest = await sha256\(value\);/,
    "sha256Fingerprint must hash through the fallback-aware helper",
  );
});

test("the attachment upload checksum works without WebCrypto", () => {
  assert.equal(
    uploadSource.includes("globalThis.crypto.subtle"),
    false,
    "the upload checksum must not touch crypto.subtle directly",
  );
  assert.equal(
    uploadSource.includes("checksumUnavailable"),
    false,
    "the upload must not throw a raw checksumUnavailable id off-localhost",
  );
  assert.match(
    uploadSource,
    /const digest = await sha256\(bytes\);/,
    "the upload checksum must hash through the fallback-aware helper",
  );
});

test("terminal clipboard reads/writes are optional-chained", () => {
  // Ctrl+C and the context-menu copy, across both terminal copies.
  assert.equal(
    /navigator\.clipboard\.writeText/.test(terminalSource),
    false,
    "every terminal clipboard write must be optional-chained",
  );
  assert.ok(
    terminalSource.includes("navigator.clipboard?.writeText(term.getSelection())"),
    "the terminal copy path must optional-chain the clipboard",
  );
  // Ctrl+V and the context-menu paste read `readText`, which is undefined off-localhost.
  assert.equal(
    /navigator\.clipboard\s*\n?\s*\.readText/.test(terminalSource),
    false,
    "every terminal clipboard read must be optional-chained",
  );
  assert.ok(
    /navigator\.clipboard\s*\n\s*\?\.readText\(\)/.test(terminalSource),
    "the terminal paste path must optional-chain the clipboard",
  );
});

test("the tool-layout and sidebar-item copy handlers no longer throw off-localhost", () => {
  for (const [name, source] of [
    ["ToolLayout", toolLayoutSource],
    ["WorkspaceSidebarItem", sidebarItemSource],
  ] as const) {
    assert.equal(
      /navigator\.clipboard\.writeText/.test(source),
      false,
      `${name} must optional-chain the clipboard write`,
    );
    // oxfmt freely reflows these chains, so compare on a whitespace-stripped copy:
    // the optional-chained write and the trailing swallow must remain one chain.
    const flat = source.replace(/\s+/gu, "");
    assert.match(
      flat,
      /\?\.writeText\([\s\S]*?\.catch\(\(\)=>undefined\);/,
      `${name} must optional-chain the write and swallow the (secure-context) rejection`,
    );
  }
});
