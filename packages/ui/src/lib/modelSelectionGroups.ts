import {
  isMesaCodeAgentProvider,
  resolveModelProviderFamilySpecByProviderId,
  mesaCodeProviderAccountAccessSchema,
  type MesaCodeProviderAccountAccess,
  type MesaCodeProvider,
} from "@mesa-code/shared";
import type { ModelSelectionView } from "@mesa-code/services";
import type { ModelSelectGroup } from "@/ModelConfigSelect.js";
import { decodeCustomModelValue, encodeCustomModelValue } from "@/lib/mesa-code-custom-model-value.js";
import { shouldShowModelVisionBadge } from "@/lib/modelVisionBadge.js";

export interface ModelProviderGroupLabelOptions {
  apiKeyLabel?: string;
  apiKeyBadgeLabel?: string;
  codingPlanLabel?: string;
  codingPlanBadgeLabel?: string;
  startPlanLabel?: string;
  startPlanBadgeLabel?: string;
  teamPlanBadgeLabel?: string;
  teamPlanFallbackLabel?: string;
}

function supportsRegistryApiFormat(
  selectedProvider: MesaCodeProvider,
  apiFormat: string | null | undefined,
): boolean {
  if (!apiFormat) return false;
  // 仅剩 glm（MesaCode Agent）provider；三方 CLI 的 api format 差异已随 provider 下线。
  return isMesaCodeAgentProvider(selectedProvider);
}

export function buildRegistryModelSelectGroups(
  selectedProvider: MesaCodeProvider,
  view: ModelSelectionView,
  labels: ModelProviderGroupLabelOptions = {},
): ModelSelectGroup[] {
  return view.providers.flatMap((provider) => {
    if (!supportsRegistryApiFormat(selectedProvider, provider.config.api?.type)) {
      return [];
    }

    const accountAccess = mesaCodeProviderAccountAccessSchema.safeParse(provider.config.access);
    const accountPresentation = accountAccess.success
      ? getRegistryAccountProviderGroupPresentation(provider.providerId, accountAccess.data, labels)
      : null;

    return [
      {
        key: `registry-provider:${provider.providerId}`,
        label: accountPresentation?.label || provider.providerName?.trim() || provider.providerId,
        ...(accountPresentation?.labelBadge ? { labelBadge: accountPresentation.labelBadge } : {}),
        ...(accountPresentation ? { directItems: true } : {}),
        items: provider.models.map(({ modelId, config }) => ({
          key: `registry-provider:${provider.providerId}:${modelId}`,
          value: encodeCustomModelValue(provider.providerId, modelId),
          name: modelId,
          ...(shouldShowModelVisionBadge(
            modelId,
            config.properties?.inputFormat?.supportsImage,
            provider.config.access,
          )
            ? { supportsVisionInput: true }
            : {}),
        })),
      },
    ];
  });
}

function getRegistryAccountProviderGroupPresentation(
  providerId: string,
  access: MesaCodeProviderAccountAccess,
  labels: ModelProviderGroupLabelOptions,
): Pick<ModelSelectGroup, "label" | "labelBadge"> {
  const familySpec = resolveModelProviderFamilySpecByProviderId(providerId);
  const label = familySpec?.label ?? providerId;
  if (access.mode === "start-plan") {
    return { label: "Start Plan", labelBadge: labels.startPlanBadgeLabel ?? "Free" };
  }
  if (access.mode === "team-coding-plan") {
    return { label, labelBadge: labels.teamPlanBadgeLabel ?? "Team" };
  }
  return { label, labelBadge: labels.codingPlanBadgeLabel ?? "Individual" };
}

export function resolveModelDisplayName(
  modelGroups: readonly ModelSelectGroup[],
  value: string,
): string | null {
  for (const group of modelGroups) {
    const matched = group.items.find((item) => item.value === value);
    if (matched) return matched.name;
  }

  return decodeCustomModelValue(value)?.modelName ?? null;
}
