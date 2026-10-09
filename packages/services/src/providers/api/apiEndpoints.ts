import { buildRuntimeMesaCodeApiUrl, resolveZaiBusinessBaseUrl } from "@mesa-code/shared";

export const MESA_CODE_CLIENT_SCENES_URL = buildRuntimeMesaCodeApiUrl(
  process.env,
  "/api/v1/client/scenes",
);

export const ZAI_API_HOST = resolveZaiBusinessBaseUrl(process.env);
