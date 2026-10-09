import assert from "node:assert/strict";
import { test } from "node:test";

import { COMPONENT_MAX, bumpInstallerVersion } from "./bump-desktop-version.mjs";

test("bumps the patch field by one", () => {
  assert.equal(bumpInstallerVersion("1.0.0"), "1.0.1");
  assert.equal(bumpInstallerVersion("2.3.4"), "2.3.5");
});

test("caps the patch at 10 and carries into the minor field", () => {
  assert.equal(bumpInstallerVersion("1.0.9"), "1.0.10");
  assert.equal(bumpInstallerVersion("1.0.10"), "1.1.0");
});

test("caps the minor at 10 and carries into the major field", () => {
  assert.equal(bumpInstallerVersion("1.10.9"), "1.10.10");
  assert.equal(bumpInstallerVersion("1.10.10"), "2.0.0");
});

test("follows the documented successive sequence from 1.0.0", () => {
  let current = "1.0.0";
  const produced = [];
  // 121 steps reach 2.0.0; 2000 gives ample headroom while the walk is deterministic.
  for (let step = 0; step < 2000; step += 1) {
    current = bumpInstallerVersion(current);
    produced.push(current);
  }

  const prefix = [
    "1.0.1",
    "1.0.2",
    "1.0.3",
    "1.0.4",
    "1.0.5",
    "1.0.6",
    "1.0.7",
    "1.0.8",
    "1.0.9",
    "1.0.10",
    "1.1.0",
  ];
  assert.deepEqual(produced.slice(0, prefix.length), prefix);

  for (const checkpoint of ["1.0.10", "1.1.0", "1.10.10", "2.0.0"]) {
    assert.ok(produced.includes(checkpoint), `sequence did not produce ${checkpoint}`);
  }

  // The step immediately after each documented boundary must be the carried value.
  assert.equal(produced[produced.indexOf("1.0.10") + 1], "1.1.0");
  assert.equal(produced[produced.indexOf("1.10.10") + 1], "2.0.0");
});

test("never emits a minor or patch above the cap, and keeps three numeric fields", () => {
  let current = "1.0.0";
  for (let step = 0; step < 1000; step += 1) {
    current = bumpInstallerVersion(current);
    assert.match(current, /^\d+\.\d+\.\d+$/);
    const [, minor, patch] = current.split(".").map(Number);
    assert.ok(minor <= COMPONENT_MAX, `minor ${minor} exceeded cap at ${current}`);
    assert.ok(patch <= COMPONENT_MAX, `patch ${patch} exceeded cap at ${current}`);
  }
});

test("rejects a version that is not three numeric fields", () => {
  assert.throws(() => bumpInstallerVersion("1.0"), /Unsupported package version/);
  assert.throws(() => bumpInstallerVersion("v1.0.0"), /Unsupported package version/);
  assert.throws(() => bumpInstallerVersion("1.0.0-beta"), /Unsupported package version/);
});
