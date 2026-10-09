import type { ReactNode } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Loader2Icon } from "lucide-react";
import {
  TID_MODEL_PROVIDER_ADD_PROVIDER_BUTTON,
  TID_MODEL_PROVIDER_NAV_ITEM,
  testId,
} from "@mesa-code/shared";
import { cn } from "@/components/lib/utils.js";
import { ControlHintTooltip } from "@/ControlHintTooltip.js";
import type {
  ModelProviderNavGroup,
  ModelProviderNavItem,
} from "@/settings/model-provider-section/constants.js";
import { ProviderDetailFeedbackBoundary } from "@/settings/model-provider-section/ProviderDetailFeedback.js";
import { renderModelProviderNavIcon } from "@/settings/model-provider-section/utils.js";
import { SettingsResourceHeaderActions } from "@/settings/SettingsResourceHeaderActions.js";

interface ModelProviderSectionLayoutProps {
  description: string;
  refreshLabel: string;
  loadingLabel: string;
  presetLoading: boolean;
  customLoading: boolean;
  onRefresh: () => void;
  addProviderLabel: string;
  onAddProvider: () => void;
  navigationGroups: ModelProviderNavGroup[];
  selectedNodeKey: string | null;
  onSelectNavItem: (item: ModelProviderNavItem) => void;
  onReorderProviderIds?: (providerIds: string[]) => Promise<void>;
  reorderableProviderIds?: ReadonlySet<string>;
  children: ReactNode;
}

function shouldShowModelProviderRefreshLoading(params: {
  presetLoading: boolean;
  customLoading: boolean;
}): boolean {
  return params.presetLoading || params.customLoading;
}

/** A chip can be dragged only when it carries a reorderable provider. */
function getSortableProviderId(
  item: ModelProviderNavItem,
  reorderableProviderIds?: ReadonlySet<string>,
): string | null {
  if ((item.type === "custom" || item.type === "preset") && item.provider) {
    return !reorderableProviderIds || reorderableProviderIds.has(item.provider.providerId)
      ? item.provider.providerId
      : null;
  }
  return null;
}

function chipClassName(selected: boolean, dragging = false): string {
  return cn(
    "group inline-flex max-w-64 min-w-0 items-center gap-2 rounded-full border px-3 py-1.5 text-ui-base transition-colors outline-none",
    "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20",
    selected
      ? "border-primary/40 bg-primary/10 text-foreground"
      : "border-border bg-surface text-foreground-subtle hover:border-border-hover hover:bg-hover hover:text-foreground",
    dragging && "opacity-70 shadow-lg",
  );
}

function ChipContent({ item }: { item: ModelProviderNavItem }) {
  return (
    <>
      <span className="shrink-0 text-current">{renderModelProviderNavIcon(item)}</span>
      <span className="min-w-0 truncate font-medium">{item.label}</span>
      {"statusActive" in item && item.statusActive ? (
        <span className="size-1.5 shrink-0 rounded-full bg-success" aria-hidden="true" />
      ) : null}
    </>
  );
}

function ModelProviderChip({
  item,
  selected,
  onSelect,
}: {
  item: ModelProviderNavItem;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <ControlHintTooltip title={item.label}>
      <button
        type="button"
        role="tab"
        aria-selected={selected}
        aria-label={item.label}
        data-testid={testId(TID_MODEL_PROVIDER_NAV_ITEM, item.key)}
        data-provider-chip={item.type}
        onClick={onSelect}
        className={chipClassName(selected)}
      >
        <ChipContent item={item} />
      </button>
    </ControlHintTooltip>
  );
}

function SortableProviderChip({
  providerId,
  item,
  selected,
  onSelect,
}: {
  providerId: string;
  item: ModelProviderNavItem;
  selected: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: providerId,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <ControlHintTooltip title={item.label}>
      <button
        ref={setNodeRef}
        style={style}
        type="button"
        aria-selected={selected}
        aria-label={item.label}
        data-testid={testId(TID_MODEL_PROVIDER_NAV_ITEM, item.key)}
        data-provider-chip={item.type}
        className={cn(chipClassName(selected, isDragging), "cursor-grab active:cursor-grabbing")}
        onClick={onSelect}
        {...attributes}
        {...listeners}
      >
        <ChipContent item={item} />
      </button>
    </ControlHintTooltip>
  );
}

export function ModelProviderSectionLayout({
  description,
  refreshLabel,
  loadingLabel,
  presetLoading,
  customLoading,
  onRefresh,
  addProviderLabel,
  onAddProvider,
  navigationGroups,
  selectedNodeKey,
  onSelectNavItem,
  onReorderProviderIds,
  reorderableProviderIds,
  children,
}: ModelProviderSectionLayoutProps) {
  const refreshButtonLoading = shouldShowModelProviderRefreshLoading({
    presetLoading,
    customLoading,
  });
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // 只渲染有内容的组：没有自定义 provider 时不占用顶部空间。
  const visibleGroups = navigationGroups.filter(
    (group) => group.id !== "custom" || group.items.length > 0,
  );
  const loading = presetLoading || customLoading;
  const items = visibleGroups.flatMap((group) => group.items);
  const sortableIds = items
    .map((item) => getSortableProviderId(item, reorderableProviderIds))
    .filter((id): id is string => id !== null);
  const canReorder = Boolean(onReorderProviderIds) && sortableIds.length > 1;

  const handleDragEnd = (event: DragEndEvent) => {
    if (!onReorderProviderIds) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const current = [...sortableIds];
    const from = current.indexOf(String(active.id));
    const to = current.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    void onReorderProviderIds(arrayMove(current, from, to));
  };

  const chipRow = (
    <div
      className="flex flex-wrap items-center gap-2"
      data-model-provider-chip-row="true"
      role={canReorder ? undefined : "tablist"}
      aria-label={canReorder ? undefined : addProviderLabel}
    >
      {loading ? <Loader2Icon className="size-3.5 animate-spin text-foreground-subtlest" /> : null}
      {items.map((item) => {
        const providerId = getSortableProviderId(item, reorderableProviderIds);
        return providerId && canReorder ? (
          <SortableProviderChip
            key={item.key}
            providerId={providerId}
            item={item}
            selected={item.key === selectedNodeKey}
            onSelect={() => onSelectNavItem(item)}
          />
        ) : (
          <ModelProviderChip
            key={item.key}
            item={item}
            selected={item.key === selectedNodeKey}
            onSelect={() => onSelectNavItem(item)}
          />
        );
      })}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <p className="max-w-2xl text-ui-base leading-6 text-foreground-subtle">{description}</p>
        <SettingsResourceHeaderActions
          onRefresh={onRefresh}
          onNew={onAddProvider}
          refreshing={refreshButtonLoading}
          refreshLabel={refreshButtonLoading ? loadingLabel : refreshLabel}
          newLabel={addProviderLabel}
          newTestId={TID_MODEL_PROVIDER_ADD_PROVIDER_BUTTON}
        />
      </div>

      {items.length > 0 || loading ? (
        canReorder ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sortableIds} strategy={horizontalListSortingStrategy}>
              {chipRow}
            </SortableContext>
          </DndContext>
        ) : (
          chipRow
        )
      ) : null}

      <div
        className="relative min-h-96 overflow-clip rounded-xl border border-border bg-card p-4 pb-20 sm:p-6 sm:pb-24"
        data-model-provider-detail-panel="true"
      >
        <ProviderDetailFeedbackBoundary key={selectedNodeKey ?? "unselected-provider"}>
          {children}
        </ProviderDetailFeedbackBoundary>
      </div>
    </div>
  );
}
