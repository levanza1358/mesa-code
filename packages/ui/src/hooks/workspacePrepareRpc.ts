/**
 * workspace prepare 的协议 RPC 收口。
 *
 * 拆出原因：useWorkspacePrepare.ts 只保留可单测的轻量判定入口；
 * 这里只读取 workspace presentation（mode/slash commands）；模型选择事实由目标 Host View 提供。
 */
import type { IMesaCodeSessionService } from "@mesa-code/services";
import { type MesaCodeProvider, type MesaCodeWorkspacePrepareResult } from "@mesa-code/shared";
import { getChatErrorMessage } from "@/lib/chatPrepareError.js";
import { logger } from "@/logger.js";
import { mesaCodeWorkspacePresentationToConfigOptions } from "@/lib/mesa-code-session-projection.js";

export async function prepareWorkspaceWithMesaCodeSessionService(params: {
  workspacePath: string;
  workspaceIdentity?: string;
  provider: MesaCodeProvider;
  mesaCodeSessionService: Pick<IMesaCodeSessionService, "readWorkspacePresentation">;
}): Promise<MesaCodeWorkspacePrepareResult> {
  const startedAt = Date.now();
  logger.info("[mesa-code-workspace-presentation] workspace prepare start", {
    workspacePath: params.workspacePath,
    workspaceIdentity: params.workspaceIdentity ?? null,
    provider: params.provider,
  });

  let presentation: Awaited<ReturnType<IMesaCodeSessionService["readWorkspacePresentation"]>>;
  try {
    presentation = await params.mesaCodeSessionService.readWorkspacePresentation({
      workspacePath: params.workspacePath,
      workspaceIdentity: params.workspaceIdentity,
    });
  } catch (error) {
    logger.warn("[mesa-code-workspace-presentation] readWorkspacePresentation failed", {
      workspacePath: params.workspacePath,
      workspaceIdentity: params.workspaceIdentity ?? null,
      provider: params.provider,
      durationMs: Date.now() - startedAt,
      error: getChatErrorMessage(error),
    });
    throw error;
  }

  const readPresentationDurationMs = Date.now() - startedAt;
  const configOptions = mesaCodeWorkspacePresentationToConfigOptions(presentation.mode);
  const totalDurationMs = Date.now() - startedAt;
  logger.info("[mesa-code-workspace-presentation] readWorkspacePresentation done", {
    workspacePath: params.workspacePath,
    workspaceIdentity: params.workspaceIdentity ?? null,
    provider: params.provider,
    readPresentationDurationMs,
    totalDurationMs,
    configOptionsCount: configOptions.length,
    modeCurrent: presentation.mode,
  });

  return {
    workspacePath: params.workspacePath,
    preparedSessionId: "",
    version: "MesaCode Protocol/1",
    provider: params.provider,
    configOptions,
    slashCommands: presentation.slashCommands,
  };
}
