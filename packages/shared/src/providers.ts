import { z } from "zod";

/**
 * MesaCode agent 提供方的单一真源。
 *
 * 类型 MesaCodeProvider、运行时 schema mesaCodeProviderSchema 都从这里派生,
 * 避免各处内联 z.enum([...]) 副本随新增/删除 provider 漂移。
 * 本模块只依赖 zod(叶子),可被 validation / mesa-code-protocol 等无环引用。
 */
const MESA_CODE_PROVIDERS = ["glm"] as const;

export const mesaCodeProviderSchema = z.enum(MESA_CODE_PROVIDERS);

export type MesaCodeProvider = (typeof MESA_CODE_PROVIDERS)[number];
