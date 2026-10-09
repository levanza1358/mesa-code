import { MESA_CODE_VERSION, type MesaCodeEnv } from "@mesa-code/shared";

declare const __MESA_CODE_CDN_BASE_URL__: string | undefined;
const DEFAULT_CDN_BASE_URL = "https://cdn-mesa-code.z.ai";

export interface ResolveRemoteCdnOptions {
  env?: MesaCodeEnv;
  locale?: string;
  timeZone?: string;
  overrideBaseUrl?: string;
  version?: string;
  now?: Date;
}

function normalizeBaseUrl(value: string): string {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol))
    throw new Error("CDN URL must use http or https");
  return value.replace(/\/+$/, "");
}

export function resolveRemoteCdnBaseUrls(options: ResolveRemoteCdnOptions = {}): string[] {
  const override = options.overrideBaseUrl?.trim();
  if (override) return [normalizeBaseUrl(override)];
  const baseUrl =
    process.env.MESA_CODE_CDN_BASE_URL?.trim() ||
    (typeof __MESA_CODE_CDN_BASE_URL__ === "undefined" ? "" : __MESA_CODE_CDN_BASE_URL__) ||
    DEFAULT_CDN_BASE_URL;
  return [
    `${normalizeBaseUrl(baseUrl)}/mesa-code/electron/releases/${options.version ?? MESA_CODE_VERSION}`,
  ];
}
