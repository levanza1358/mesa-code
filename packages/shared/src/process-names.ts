const MESA_CODE_PROCESS_PREFIX = "mesa-code";
const MAX_PROCESS_NAME_SEGMENT_LENGTH = 24;

function sanitizeProcessNameSegment(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, MAX_PROCESS_NAME_SEGMENT_LENGTH);
}

function joinMesaCodeProcessName(...segments: Array<string | null | undefined>): string {
  const sanitizedSegments = segments
    .map((segment) => sanitizeProcessNameSegment(segment))
    .filter((segment): segment is string => Boolean(segment));
  return [MESA_CODE_PROCESS_PREFIX, ...sanitizedSegments].join("-");
}

function pickWorkspaceTag(workspacePath: string | null | undefined): string | undefined {
  const trimmedPath = workspacePath?.trim();
  if (!trimmedPath) {
    return undefined;
  }

  const parts = trimmedPath.split(/[\\/]+/).filter(Boolean);
  return parts.at(-1) ?? trimmedPath;
}

export function formatMesaCodeMainProcessName(): string {
  return joinMesaCodeProcessName("main");
}

export function formatMesaCodeGpuProcessName(): string {
  return joinMesaCodeProcessName("gpu");
}

export function formatMesaCodeHostProcessName(label?: string): string {
  return joinMesaCodeProcessName("host", label);
}

export function formatMesaCodeRendererProcessName(windowTitle?: string): string {
  const normalizedTitle = windowTitle?.trim();
  if (!normalizedTitle || normalizedTitle === "MesaCode") {
    return joinMesaCodeProcessName("renderer", "main");
  }

  if (normalizedTitle === "Resource Manager") {
    return joinMesaCodeProcessName("renderer", "resource-manager");
  }

  const remoteWindowPrefix = "MesaCode - ";
  if (normalizedTitle.startsWith(remoteWindowPrefix)) {
    return joinMesaCodeProcessName(
      "renderer",
      "remote",
      normalizedTitle.slice(remoteWindowPrefix.length),
    );
  }

  return joinMesaCodeProcessName("renderer", normalizedTitle);
}

export function formatMesaCodeAgentProcessName(provider: string, workspacePath?: string): string {
  return joinMesaCodeProcessName("agent", provider, pickWorkspaceTag(workspacePath));
}

export function formatMesaCodeUtilityProcessName(name?: string, type = "utility"): string {
  return joinMesaCodeProcessName(type, name);
}
