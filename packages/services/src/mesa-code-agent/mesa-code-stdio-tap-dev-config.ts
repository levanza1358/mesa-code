import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { MesaCodeStdioTapDevState } from "@mesa-code/shared";
import { getAppConfigDir } from "#src/paths.js";
import { isEffectiveDevelopmentNodeEnv } from "#src/runtime-tools/nodeEnv.js";

interface MesaCodeStdioTapStateFile {
  enabled?: boolean;
}

function isMesaCodeStdioTapDevVisible(): boolean {
  return isEffectiveDevelopmentNodeEnv();
}

function getMesaCodeStdioTapDevDir(): string {
  return join(getAppConfigDir(), "dev");
}

export function getMesaCodeStdioTapDevLogDir(): string {
  return join(getMesaCodeStdioTapDevDir(), "stdio-traffic");
}

function getMesaCodeStdioTapDevStatePath(): string {
  return join(getMesaCodeStdioTapDevDir(), "mesa-code-stdio-tap.json");
}

function readStateFile(path: string): MesaCodeStdioTapStateFile {
  if (!existsSync(path)) {
    return {};
  }

  try {
    const parsed = JSON.parse(readFileSync(path, "utf-8")) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as MesaCodeStdioTapStateFile) : {};
  } catch {
    return {};
  }
}

export function readMesaCodeStdioTapDevState(): MesaCodeStdioTapDevState {
  const visible = isMesaCodeStdioTapDevVisible();
  const statePath = getMesaCodeStdioTapDevStatePath();
  const fileState = readStateFile(statePath);
  return {
    enabled: visible && fileState.enabled === true,
    visible,
    logDir: getMesaCodeStdioTapDevLogDir(),
    statePath,
  };
}

export function setMesaCodeStdioTapDevEnabled(enabled: boolean): MesaCodeStdioTapDevState {
  const visible = isMesaCodeStdioTapDevVisible();
  const statePath = getMesaCodeStdioTapDevStatePath();
  mkdirSync(getMesaCodeStdioTapDevDir(), { recursive: true });
  writeFileSync(
    statePath,
    `${JSON.stringify(
      {
        // 开发态 stdio 抓包是高频原始协议帧，只能通过显式开关写旁路文件，避免误进生产日志。
        enabled: visible && enabled,
        updatedAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
  );
  return readMesaCodeStdioTapDevState();
}
