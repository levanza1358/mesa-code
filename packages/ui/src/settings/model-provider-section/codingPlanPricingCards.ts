import { BUILTIN_MODEL_PROVIDER_IDS } from "@mesa-code/shared";
import type { CodingPlanProviderId } from "@/settings/model-provider-section/constants.js";

// Purchase flow uses the embedded provider webview; this helper selects its product source.

export function resolveCodingPlanUpgradeProductsProviderId(
  providerId: CodingPlanProviderId,
): CodingPlanProviderId {
  // Start Plan 是免费入口，编程套餐列表应直接展示原 Z.AI Coding Plan 付费套餐。
  // 继续用 Start Plan providerId 会把免费 Start SKU 当成可购买套餐重复展示。
  if (providerId === BUILTIN_MODEL_PROVIDER_IDS.zaiStartPlan) {
    return BUILTIN_MODEL_PROVIDER_IDS.zaiIndividualCodingPlan;
  }

  // BigModel Start Plan 同样是免费入口，展开升级时必须使用
  // BigModel paid Coding Plan 商品源，不能拿 Start providerId 请求免费 SKU。
  return providerId === BUILTIN_MODEL_PROVIDER_IDS.bigmodelStartPlan
    ? BUILTIN_MODEL_PROVIDER_IDS.bigmodelIndividualCodingPlan
    : providerId;
}
