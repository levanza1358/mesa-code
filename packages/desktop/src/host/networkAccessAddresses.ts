import { networkInterfaces } from "node:os";

/**
 * Pure helpers for local network address discovery.
 *
 * Kept free of any listener/HTTP concern so they can be unit-tested against a
 * synthetic interface map. Tailscale addresses are just IPv4 addresses in the
 * CGNAT range 100.64.0.0/10 — no Tailscale-specific API is needed to find them.
 */

/** The IPv4 CGNAT range Tailscale assigns (100.64.0.0/10), as [100, 64]..[100, 127]. */
export function isTailscaleAddress(address: string): boolean {
  const firstOctetDot = address.indexOf(".");
  if (firstOctetDot <= 0) {
    return false;
  }
  const first = Number(address.slice(0, firstOctetDot));
  const secondEnd = address.indexOf(".", firstOctetDot + 1);
  if (secondEnd < 0) {
    return false;
  }
  const second = Number(address.slice(firstOctetDot + 1, secondEnd));
  if (!Number.isInteger(first) || !Number.isInteger(second)) {
    return false;
  }
  // 100.64.0.0/10 => first octet 100, second octet 64..127.
  return first === 100 && second >= 64 && second <= 127;
}

export interface DiscoveredAddress {
  kind: "lan" | "tailscale";
  address: string;
}

/**
 * Every non-internal IPv4 address of the machine, deduplicated, Tailscale first.
 * Mirrors the interface enumeration the distribution runner uses (`networkUrls`).
 */
export function collectLocalAddresses(
  interfaces: ReturnType<typeof networkInterfaces> = networkInterfaces(),
): DiscoveredAddress[] {
  const seen = new Set<string>();
  const lan: DiscoveredAddress[] = [];
  const tailscale: DiscoveredAddress[] = [];
  for (const entries of Object.values(interfaces)) {
    for (const entry of entries ?? []) {
      if (entry.internal || entry.family !== "IPv4") {
        continue;
      }
      if (seen.has(entry.address)) {
        continue;
      }
      seen.add(entry.address);
      const kind = isTailscaleAddress(entry.address) ? "tailscale" : "lan";
      const target = kind === "tailscale" ? tailscale : lan;
      target.push({ kind, address: entry.address });
    }
  }
  lan.sort((a, b) => a.address.localeCompare(b.address));
  tailscale.sort((a, b) => a.address.localeCompare(b.address));
  return [...tailscale, ...lan];
}

/** Build the browser URL for an address and port, omitting the port when it is the HTTP default 80. */
export function formatAccessUrl(address: string, port: number): string {
  return port === 80 ? `http://${address}` : `http://${address}:${port}`;
}
