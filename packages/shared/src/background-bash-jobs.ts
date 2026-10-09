import {
  collectVisibleMesaCodeBackgroundTaskControlItems,
  getMesaCodeBackgroundTaskControlItemElapsedMs,
  isActiveMesaCodeBackgroundTaskControlItem,
  parseMesaCodeBackgroundTaskControlItems,
  type MesaCodeBackgroundTaskControlItem,
  type MesaCodeBackgroundTaskControlStatus,
} from "./background-task-controls.js";

export type MesaCodeBackgroundBashJobStatus = MesaCodeBackgroundTaskControlStatus;
export type MesaCodeBackgroundBashJob = MesaCodeBackgroundTaskControlItem & {
  taskKind: "bash";
};

export function parseMesaCodeBackgroundBashJobs(value: unknown): MesaCodeBackgroundBashJob[] {
  return parseMesaCodeBackgroundTaskControlItems(value).filter(isBackgroundBashJob);
}

export function isActiveMesaCodeBackgroundBashJob(job: MesaCodeBackgroundBashJob): boolean {
  return isActiveMesaCodeBackgroundTaskControlItem(job);
}

export function getMesaCodeBackgroundBashJobElapsedMs(
  job: MesaCodeBackgroundBashJob,
  now = Date.now(),
): number {
  return getMesaCodeBackgroundTaskControlItemElapsedMs(job, now);
}

export function collectVisibleMesaCodeBackgroundBashJobs(
  jobs: readonly MesaCodeBackgroundBashJob[],
  now = Date.now(),
  thresholdMs = 30_000,
): Array<MesaCodeBackgroundBashJob & { elapsedMs: number }> {
  return collectVisibleMesaCodeBackgroundTaskControlItems(jobs, now, thresholdMs) as Array<
    MesaCodeBackgroundBashJob & { elapsedMs: number }
  >;
}

function isBackgroundBashJob(job: MesaCodeBackgroundTaskControlItem): job is MesaCodeBackgroundBashJob {
  return job.taskKind === "bash";
}
