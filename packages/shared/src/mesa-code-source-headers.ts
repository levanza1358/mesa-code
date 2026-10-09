import { DEFAULT_MESA_CODE_ENDPOINT_ORIGIN } from "./mesa-code-endpoint.js";

export const MESA_CODE_SOURCE_HEADERS = {
  "User-Agent": "MesaCode/unknown",
  "HTTP-Referer": DEFAULT_MESA_CODE_ENDPOINT_ORIGIN,
  "X-Title": "Z Code@electron",
} as const;

export interface BuildMesaCodeSourceHeadersFromContextOptions {
  appVersion?: string;
  arch?: string;
  clientLanguage?: string;
  clientTimezone?: string;
  deviceMid?: string;
  endpointOrigin?: string;
  osVersion?: string;
  platform?: string;
  releaseChannel?: string;
  sourceTitle?: string;
}

export function normalizeMesaCodeSourceHeaderValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed || !/^[\x20-\x7e]+$/.test(trimmed)) {
    return undefined;
  }
  return trimmed;
}

export function buildMesaCodeSourceHeadersFromContext(
  options: BuildMesaCodeSourceHeadersFromContextOptions = {},
): Record<string, string> {
  const appVersion = normalizeMesaCodeSourceHeaderValue(options.appVersion);
  const arch = normalizeMesaCodeSourceHeaderValue(options.arch);
  const clientLanguage = normalizeMesaCodeSourceHeaderValue(options.clientLanguage) ?? "unknown";
  const clientTimezone = normalizeMesaCodeSourceHeaderValue(options.clientTimezone) ?? "unknown";
  const deviceMid = normalizeMesaCodeSourceHeaderValue(options.deviceMid);
  const endpointOrigin =
    normalizeMesaCodeSourceHeaderValue(options.endpointOrigin) ?? DEFAULT_MESA_CODE_ENDPOINT_ORIGIN;
  const osVersion = normalizeMesaCodeSourceHeaderValue(options.osVersion);
  const platform = normalizeMesaCodeSourceHeaderValue(options.platform);
  const releaseChannel = normalizeMesaCodeSourceHeaderValue(options.releaseChannel);
  const sourceTitle = normalizeMesaCodeSourceHeaderValue(options.sourceTitle) ?? "electron";

  return {
    ...MESA_CODE_SOURCE_HEADERS,
    "HTTP-Referer": endpointOrigin,
    "User-Agent": `MesaCode/${appVersion ?? "unknown"}`,
    ...(appVersion ? { "X-MesaCode-App-Version": appVersion } : {}),
    "X-Title": `Z Code@${sourceTitle}`,
    ...(platform && arch ? { "X-Platform": `${platform}-${arch}` } : {}),
    ...(releaseChannel ? { "X-Release-Channel": releaseChannel } : {}),
    "X-Client-Language": clientLanguage,
    "X-Client-Timezone": clientTimezone,
    ...(platform ? { "X-Os-Category": normalizeOsCategory(platform) } : {}),
    ...(osVersion ? { "X-Os-Version": osVersion } : {}),
    ...(deviceMid ? { "X-Device-Mid": deviceMid } : {}),
  };
}

function normalizeOsCategory(platform: string): string {
  switch (platform) {
    case "darwin":
      return "macos";
    case "win32":
      return "windows";
    default:
      return "linux";
  }
}
