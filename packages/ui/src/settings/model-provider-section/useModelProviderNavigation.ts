/* eslint-disable max-lines -- Model Provider 导航需要集中计算分组、选中项与 Coding Plan 权益态，后续拆分时再收敛。 */
import { useEffect, useMemo } from "react";
import type { ProviderFamilyConnectionSelection, ProviderFamilyDomain } from "@mesa-code/shared";
import type { ProviderSettingsFormProvider } from "@/lib/providerSettingsFormTypes.js";
import { getProviderFormLabel } from "@/lib/providerSettingsFormTypes.js";
import { useMesaCodeIntl } from "@/i18n/IntlProvider.js";
import type { ModelProviderNavGroup } from "@/settings/model-provider-section/constants.js";
import { createCustomProviderNodeKey } from "@/settings/model-provider-section/utils.js";
import {
  sortModelProvidersForDisplay,
  type ProviderOrderView,
} from "@/lib/modelProviderOrdering.js";


interface UseModelProviderNavigationOptions {
  modelProviders: ProviderSettingsFormProvider[];
  displayOrder?: ProviderOrderView;
  selectedNodeKey: string | null;
  setSelectedNodeKey: (key: string | null) => void;
  intl: ReturnType<typeof useMesaCodeIntl>["intl"];
}

export function connectionSelectionMatchesNavigationItem(
  _family: ProviderFamilyDomain,
  _selection: ProviderFamilyConnectionSelection,
  item: Exclude<ModelProviderNavGroup["items"][number], { type: "codingPlanLoading" }>,
): boolean {
  return item.type !== "custom";
}

export function useModelProviderNavigation({
  modelProviders,
  displayOrder,
  selectedNodeKey,
  setSelectedNodeKey,
  intl,
}: UseModelProviderNavigationOptions) {
  const customProviders = useMemo(() => {
    const allCustomProviders = modelProviders.filter(
      (provider) => provider.config.group === "standard-personal",
    );
    // 这里复用模型菜单的展示排序，确保设置页和聊天框供应商顺序一致。
    return sortModelProvidersForDisplay(allCustomProviders, displayOrder);
  }, [displayOrder, modelProviders]);

  // Built-in, account, and subscription navigation is intentionally omitted.
  const navigationGroups = useMemo<ModelProviderNavGroup[]>(() => {
    // Model settings intentionally exposes only persisted custom providers.
    // Built-in/account/plan providers remain available to runtime compatibility code,
    // but must not become selectable settings UI in the custom-provider-only product.
    return [
      {
        id: "custom",
        title: intl.formatMessage({ id: "settings.modelProvider.customTitle" }),
        items: customProviders.map((provider) => ({
          key: createCustomProviderNodeKey(provider.providerId),
          type: "custom" as const,
          label: getProviderFormLabel(provider),
          provider,
          statusActive: provider.executable === true,
        })),
      },
    ];
  }, [customProviders, intl]);

  const navigationItems = useMemo(
    () => navigationGroups.flatMap((group) => group.items),
    [navigationGroups],
  );
  const selectedNavItem =
    (selectedNodeKey
      ? navigationItems.find((item) => item.key === selectedNodeKey)
      : undefined) ?? null;
  const fallbackNodeKey = navigationItems[0]?.key ?? null;
  const navigationUnavailable = false;

  useEffect(() => {
    if (selectedNavItem || selectedNodeKey === fallbackNodeKey) {
      return;
    }
    setSelectedNodeKey(fallbackNodeKey);
  }, [fallbackNodeKey, selectedNavItem, selectedNodeKey, setSelectedNodeKey]);

  return {
    navigationGroups,
    navigationItems,
    selectedNavItem,
    navigationUnavailable,
  };
}

