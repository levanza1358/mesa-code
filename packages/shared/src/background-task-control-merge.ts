import type { MesaCodeBackgroundTaskControlItem } from "./background-task-controls.js";

export function mergeMesaCodeBackgroundTaskControlItems(
  current: readonly MesaCodeBackgroundTaskControlItem[],
  updates: readonly MesaCodeBackgroundTaskControlItem[],
): MesaCodeBackgroundTaskControlItem[] {
  const jobsById = new Map(current.map((job) => [job.jobId, job] as const));
  for (const job of updates) {
    jobsById.set(job.jobId, job);
  }
  return Array.from(jobsById.values());
}
