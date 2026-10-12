import assert from "node:assert/strict";
import type { networkInterfaces } from "node:os";
import test from "node:test";
import {
  collectLocalAddresses,
  formatAccessUrl,
  isTailscaleAddress,
} from "./networkAccessAddresses.js";

/**
 * Regression coverage for local network address discovery.
 *
 * The Network settings page lists every non-internal IPv4 address so the user
 * can open the running desktop session from another device. Tailscale addresses
 * are recognised purely by range (100.64.0.0/10, the CGNAT block Tailscale
 * assigns), so the page does not depend on the Tailscale API to classify them.
 * These helpers are pure, so they take a synthetic interface map.
 */

type InterfaceMap = ReturnType<typeof networkInterfaces>;
type InterfaceEntry = NonNullable<InterfaceMap[string]>[number];

function ipv4(
  address: string,
  overrides: Partial<{ internal: boolean; family: string }> = {},
): InterfaceEntry {
  return {
    address,
    netmask: "255.255.255.0",
    family: overrides.family ?? "IPv4",
    mac: "00:00:00:00:00:00",
    internal: overrides.internal ?? false,
    cidr: `${address}/24`,
  } as InterfaceEntry;
}

test("isTailscaleAddress recognises only the 100.64.0.0/10 CGNAT range", () => {
  for (const address of ["100.64.0.0", "100.64.1.5", "100.127.255.254"]) {
    assert.equal(isTailscaleAddress(address), true, `${address} is in 100.64.0.0/10`);
  }
  for (const address of [
    "100.63.255.255", // one below the range
    "100.128.0.1", // one above the range
    "192.168.1.10",
    "10.0.0.4",
    "100.64", // truncated, no second octet boundary
    "100", // no dots at all
    "not-an-ip",
    "",
  ]) {
    assert.equal(isTailscaleAddress(address), false, `${address} must not be Tailscale`);
  }
});

test("collectLocalAddresses keeps non-internal IPv4, Tailscale first, sorted", () => {
  const interfaces: InterfaceMap = {
    tailscale0: [ipv4("100.101.102.103")],
    eth0: [ipv4("192.168.1.20"), ipv4("192.168.1.10")],
    lo: [ipv4("127.0.0.1", { internal: true })],
    wifi0: [ipv4("fe80::1", { family: "IPv6" })],
  };

  assert.deepEqual(collectLocalAddresses(interfaces), [
    { kind: "tailscale", address: "100.101.102.103" },
    { kind: "lan", address: "192.168.1.10" },
    { kind: "lan", address: "192.168.1.20" },
  ]);
});

test("collectLocalAddresses deduplicates an address seen on two interfaces", () => {
  const interfaces: InterfaceMap = {
    eth0: [ipv4("192.168.1.20")],
    eth1: [ipv4("192.168.1.20")],
  };
  assert.deepEqual(collectLocalAddresses(interfaces), [{ kind: "lan", address: "192.168.1.20" }]);
});

test("collectLocalAddresses tolerates a missing interface family", () => {
  const interfaces: InterfaceMap = { lo: undefined };
  assert.deepEqual(collectLocalAddresses(interfaces), []);
});

test("formatAccessUrl omits the port only for the HTTP default", () => {
  assert.equal(formatAccessUrl("192.168.1.20", 80), "http://192.168.1.20");
  assert.equal(formatAccessUrl("192.168.1.20", 3030), "http://192.168.1.20:3030");
  assert.equal(formatAccessUrl("100.101.102.103", 0), "http://100.101.102.103:0");
});
