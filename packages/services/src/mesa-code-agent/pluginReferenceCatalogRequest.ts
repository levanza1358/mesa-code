import {
  mesaCodeProtocolMethods,
  mesaCodePluginsReferenceCatalogResultSchema,
  type MesaCodePluginsReferenceCatalogParams,
} from "@mesa-code/shared";
import type { MesaCodeProtocolClient } from "#src/mesa-code-agent/mesa-code-protocol-client.js";

/** 旧协议严格校验响应；新展示字段走独立入口，只有 -32601 能证明旧 Agent 不支持。 */
export async function requestPluginReferenceCatalog(
  client: Pick<MesaCodeProtocolClient, "request">,
  params: MesaCodePluginsReferenceCatalogParams,
) {
  try {
    return await client.request(
      mesaCodeProtocolMethods.pluginsReferenceCatalogWithCategory,
      params,
      mesaCodePluginsReferenceCatalogResultSchema,
    );
  } catch (error) {
    if (!(typeof error === "object" && error !== null && "code" in error && error.code === -32601))
      throw error;
    return client.request(
      mesaCodeProtocolMethods.pluginsReferenceCatalog,
      params,
      mesaCodePluginsReferenceCatalogResultSchema,
    );
  }
}
