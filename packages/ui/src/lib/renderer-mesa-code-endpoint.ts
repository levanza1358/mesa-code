import {
  buildRuntimeMesaCodeEndpointUrls,
  MESA_CODE_ENV,
  type RuntimeMesaCodeEndpointEnv,
} from "@mesa-code/shared";

interface RendererImportMetaEnv {
  VITE_MESA_CODE_BASE_URL?: string;
  VITE_MESA_CODE_ENDPOINT_ORIGIN?: string;
}

function readRendererImportMetaEnv(): RendererImportMetaEnv {
  return ((import.meta as ImportMeta & { env?: RendererImportMetaEnv }).env ??
    {}) as RendererImportMetaEnv;
}

function createRendererMesaCodeEndpointEnv(
  env: RendererImportMetaEnv = readRendererImportMetaEnv(),
): RuntimeMesaCodeEndpointEnv {
  return {
    MESA_CODE_ENV,
    // UI 侧的 mesa-code-plan 占位 provider 以前只看 MESA_CODE_ENV，
    // 没有消费 Vite 注入的 base url，导致自定义测试域名时 renderer 和 host/service 可能不一致。
    MESA_CODE_BASE_URL: env.VITE_MESA_CODE_BASE_URL,
    MESA_CODE_ENDPOINT_ORIGIN: env.VITE_MESA_CODE_ENDPOINT_ORIGIN,
  };
}

export const RENDERER_MESA_CODE_ENDPOINT_URLS = buildRuntimeMesaCodeEndpointUrls(
  createRendererMesaCodeEndpointEnv(),
);
