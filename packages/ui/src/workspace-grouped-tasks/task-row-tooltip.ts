import type { MesaCodeTaskChangeSummary } from "@mesa-code/shared";

export function formatGroupedTaskHoverChangeParts(
  summary: MesaCodeTaskChangeSummary | null,
): string[] {
  if (!summary) {
    return [];
  }

  const parts: string[] = [];
  if (summary.added > 0) {
    parts.push(`+${summary.added}`);
  }
  if (summary.removed > 0) {
    parts.push(`-${summary.removed}`);
  }
  return parts;
}
