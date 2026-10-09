import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type Modifier,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { memo, useCallback, useMemo, useState, type CSSProperties } from "react";
import {
  TID_V4_QUEUE,
  TID_V4_QUEUE_ITEM,
  TID_V4_QUEUE_ITEM_DELETE,
  TID_V4_QUEUE_ITEM_EDIT,
  TID_V4_QUEUE_ITEM_SEND_NOW,
  TID_V4_QUEUE_PAUSED_BANNER,
  TID_V4_QUEUE_RESUME,
  testId,
} from "@mesa-code/shared";
import type { QueueState } from "@mesa-code/shared/mesa-code-protocol-v4";
import { ArrowUpFromLine, GripVertical, PencilIcon, Trash2Icon } from "lucide-react";
import { ControlHintTooltip } from "@/ControlHintTooltip.js";
import { Button } from "@/components/ui/button.js";
import { cn } from "@/components/lib/utils.js";
import { useMesaCodeIntl } from "@/i18n/IntlProvider.js";
import { runUserAction, runUserActionAsync } from "@/lib/userActionTelemetry.js";

interface ConversationQueuePanelProps {
  queue: QueueState;
  /** 删除队列项（deleteQueueItem command）。 */
  onDeleteItem?: (queueItemId: string) => void;
  /** 撤回队列项到发起端 composer；权威删除成功后才恢复草稿。 */
  onEditItem?: (queueItemId: string) => Promise<void> | void;
  /** 正在等待 delete ACK / composer restore 的目标项；仅锁该 row。 */
  pendingEditQueueItemId?: string | null;
  /** 立即发送队列项（sendQueuedNow command，stop 当前 + 消费该项）。 */
  onSendNow?: (queueItemId: string) => void;
  /** 拖拽排序项（reorderQueueItem，移动到锚点前；null=队尾）。 */
  onMoveItem?: (queueItemId: string, beforeQueueItemId: string | null) => void;
  /** 暂停队列恢复：CLI setAutoDrain(true)，idle 立即消费、busy 仅武装。 */
  onResume?: () => Promise<void> | void;
}

type QueueItem = QueueState["items"][number];

interface V4QueueReorderAnchor {
  beforeQueueItemId: string | null;
  queueItemId: string;
}

function resolveV4QueueReorderAnchor(
  items: readonly QueueItem[],
  activeQueueItemId: string,
  overQueueItemId: string,
): V4QueueReorderAnchor | null {
  if (activeQueueItemId === overQueueItemId) {
    return null;
  }

  const fromIndex = items.findIndex((item) => item.queueItemId === activeQueueItemId);
  const overIndex = items.findIndex((item) => item.queueItemId === overQueueItemId);
  if (fromIndex < 0 || overIndex < 0) {
    return null;
  }

  if (fromIndex < overIndex) {
    const itemsAfterRemoval = items.filter((item) => item.queueItemId !== activeQueueItemId);
    const overIndexAfterRemoval = itemsAfterRemoval.findIndex(
      (item) => item.queueItemId === overQueueItemId,
    );
    const nextItem = itemsAfterRemoval[overIndexAfterRemoval + 1];
    return {
      beforeQueueItemId: nextItem?.queueItemId ?? null,
      queueItemId: activeQueueItemId,
    };
  }

  return {
    beforeQueueItemId: overQueueItemId,
    queueItemId: activeQueueItemId,
  };
}

const restrictQueueDragToPanel: Modifier = ({
  transform,
  draggingNodeRect,
  activeNodeRect,
  containerNodeRect,
  windowRect,
}) => {
  const nodeRect = draggingNodeRect ?? activeNodeRect;
  const boundaryRect = containerNodeRect ?? windowRect;
  if (!nodeRect || !boundaryRect) {
    return {
      ...transform,
      x: 0,
    };
  }

  const minY = boundaryRect.top - nodeRect.top;
  const maxY = boundaryRect.bottom - nodeRect.bottom;
  return {
    ...transform,
    x: 0,
    y: Math.min(Math.max(transform.y, minY), maxY),
  };
};

interface QueueRowProps {
  item: QueueItem;
  index: number;
  intl: ReturnType<typeof useMesaCodeIntl>["intl"];
  sortable: boolean;
  onDeleteItem?: (queueItemId: string) => void;
  onEditItem?: (queueItemId: string) => Promise<void> | void;
  editPending: boolean;
  onSendNow?: (queueItemId: string) => void;
}

const QueueRow = memo(function QueueRow({
  item,
  index,
  intl,
  sortable,
  onDeleteItem,
  onEditItem,
  onSendNow,
  editPending,
}: QueueRowProps) {
  const dispatchLocked = item.dispatch.state !== "queued";
  const rowLocked = dispatchLocked || editPending;
  const isCompact = item.kind === "compact";
  const {
    attributes,
    isDragging,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    disabled: !sortable || rowLocked,
    id: item.queueItemId,
  });

  const style = useMemo<CSSProperties>(
    () => ({
      transform: CSS.Transform.toString(
        transform
          ? {
              ...transform,
              // dnd-kit 排序时会按 over 节点尺寸附带 scale；
              // 队列行是固定触控目标，缩放会让拖拽中的按钮和文本短暂变形。
              scaleX: 1,
              scaleY: 1,
            }
          : null,
      ),
      transition,
      zIndex: isDragging ? 10 : undefined,
    }),
    [isDragging, transition, transform],
  );
  return (
    <li
      ref={setNodeRef}
      data-testid={testId(TID_V4_QUEUE_ITEM, item.queueItemId)}
      data-queue-item-id={item.queueItemId}
      data-index={index}
      data-kind={item.kind}
      data-dispatch-state={item.dispatch.state}
      data-edit-pending={editPending ? "true" : "false"}
      className={cn(
        // Rows sit inside the queue sheet, so they step down one radius level per DESIGN.md.
        "relative flex items-center gap-2 rounded-lg px-1.5 py-1 pr-1 transition-colors hover:bg-hover/30",
        isDragging ? "bg-hover/40 shadow-sm" : null,
        editPending ? "opacity-60" : null,
      )}
      style={style}
    >
      <ControlHintTooltip title={intl.formatMessage({ id: "chat.queue.drag" })}>
        <Button
          ref={setActivatorNodeRef}
          type="button"
          variant="ghost"
          size="icon-md"
          data-v4-queue-drag-handle="true"
          data-queue-item-id={item.queueItemId}
          aria-label={intl.formatMessage({ id: "chat.queue.drag" })}
          className="shrink-0 cursor-grab touch-none text-foreground-subtlest active:cursor-grabbing"
          disabled={rowLocked}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </Button>
      </ControlHintTooltip>
      <span
        className={cn(
          "flex min-w-0 flex-1 items-center gap-2 truncate text-ui-base text-foreground",
          isCompact ? "font-mono" : null,
        )}
        title={item.text}
      >
        <span className="truncate">{isCompact ? "/compact" : item.text}</span>
      </span>
      {onSendNow ? (
        <Button
          type="button"
          variant="secondary"
          // Queued rows are a dense list; a default-size action crowds the row (DESIGN.md).
          size="sm"
          data-icon="inline-start"
          data-testid={testId(TID_V4_QUEUE_ITEM_SEND_NOW, item.queueItemId)}
          data-queue-item-id={item.queueItemId}
          disabled={rowLocked}
          onClick={() =>
            runUserAction({
              input: {
                featureId: "conversation.queue.item",
                action: "send_now",
                trigger: "button",
              },
              operation: () => onSendNow(item.queueItemId),
              completed: { resultSource: "optimistic_projection" },
              failureStage: "queue_send_now",
            })
          }
        >
          <ArrowUpFromLine className="size-3.5" />
          {intl.formatMessage({ id: isCompact ? "chat.queue.runNow" : "chat.queue.sendNow" })}
        </Button>
      ) : null}
      {onEditItem && !isCompact ? (
        <ControlHintTooltip title={intl.formatMessage({ id: "chat.queue.edit" })}>
          <Button
            type="button"
            variant="ghost"
            size="icon-md"
            data-testid={testId(TID_V4_QUEUE_ITEM_EDIT, item.queueItemId)}
            data-queue-item-id={item.queueItemId}
            aria-label={intl.formatMessage({ id: "chat.queue.edit" })}
            disabled={rowLocked}
            onClick={() => void onEditItem(item.queueItemId)}
          >
            <PencilIcon className="size-4" />
          </Button>
        </ControlHintTooltip>
      ) : null}
      {onDeleteItem ? (
        <ControlHintTooltip title={intl.formatMessage({ id: "chat.queue.remove" })}>
          <Button
            type="button"
            variant="ghost"
            size="icon-md"
            data-testid={testId(TID_V4_QUEUE_ITEM_DELETE, item.queueItemId)}
            data-queue-item-id={item.queueItemId}
            aria-label={intl.formatMessage({ id: "chat.queue.remove" })}
            disabled={rowLocked}
            onClick={() => onDeleteItem(item.queueItemId)}
          >
            <Trash2Icon className="size-4" />
          </Button>
        </ControlHintTooltip>
      ) : null}
    </li>
  );
});

/**
 * 竖切 queue 面板：渲染 projection.queue.items + 单项删除入口。
 * queue 在运行中的 turn 期间存在（sendText 排队），是 CLI 投影权威态（非 renderer-local）。
 */
function ConversationQueuePanelImpl({
  queue,
  onDeleteItem,
  onEditItem,
  pendingEditQueueItemId = null,
  onSendNow,
  onMoveItem,
  onResume,
}: ConversationQueuePanelProps) {
  const { intl } = useMesaCodeIntl();
  const [resumePending, setResumePending] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );
  const itemIds = useMemo(() => queue.items.map((item) => item.queueItemId), [queue.items]);
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const overId = event.over?.id;
      if (!overId) return;
      const anchor = resolveV4QueueReorderAnchor(
        queue.items,
        String(event.active.id),
        String(overId),
      );
      if (!anchor) return;
      onMoveItem?.(anchor.queueItemId, anchor.beforeQueueItemId);
    },
    [onMoveItem, queue.items],
  );
  const handleResume = useCallback(async () => {
    if (!onResume || resumePending) return;
    setResumePending(true);
    try {
      await runUserActionAsync({
        input: { featureId: "conversation.queue.policy", action: "resume", trigger: "button" },
        operation: () => Promise.resolve(onResume()),
        completed: { resultSource: "authority_ack" },
        failureStage: "queue_resume",
      });
    } finally {
      setResumePending(false);
    }
  }, [onResume, resumePending]);

  if (queue.items.length === 0) return null;
  // The queued sheet is drawn together with the composer as one continuous surface: it shares the
  // composer's border token and fill and tucks under it via -mb-7/pb-7. The old separate frame
  // (rounded-t-2xl + border + bg-surface + backdrop-blur) drew a second outline with a mismatched
  // radius, because the composer paints later on top — a doubled, crooked seam. The shared radius,
  // border, and fill now live in quiet-studio.css so the two halves can never diverge again.
  return (
    <div
      data-testid={TID_V4_QUEUE}
      data-queue-count={queue.items.length}
      data-queue-auto-drain={queue.autoDrain ? "true" : "false"}
      className={cn(
        "quiet-studio-queue-sheet relative z-0 w-full overflow-hidden p-1",
        "-mb-7 pb-7",
      )}
    >
      {!queue.autoDrain ? (
        <div
          data-testid={TID_V4_QUEUE_PAUSED_BANNER}
          // bg-surface-raised was never defined in any theme, so this banner rendered with no fill.
          // Step the radius down one level from the queue sheet, matching the rows.
          className="mb-1 flex min-h-10 items-center gap-3 rounded-lg border border-border/70 bg-card px-3 py-2 text-ui-base text-foreground"
        >
          <span className="min-w-0 flex-1">
            {intl.formatMessage({
              id:
                queue.pauseReason === "stopped"
                  ? "chat.queue.paused.stopped"
                  : queue.pauseReason === "error"
                    ? "chat.queue.paused.error"
                    : "chat.queue.paused.generic",
            })}
          </span>
          {onResume ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              data-testid={TID_V4_QUEUE_RESUME}
              aria-label={intl.formatMessage({ id: "chat.queue.resume.description" })}
              disabled={resumePending}
              className="shrink-0 text-foreground-subtle hover:text-foreground"
              onClick={() => void handleResume()}
            >
              {intl.formatMessage({ id: "chat.queue.resume" })}
            </Button>
          ) : null}
        </div>
      ) : null}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictQueueDragToPanel]}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          <ul className="space-y-0.5">
            {queue.items.map((item, index) => (
              <QueueRow
                key={item.queueItemId}
                item={item}
                index={index}
                intl={intl}
                sortable={Boolean(onMoveItem)}
                onDeleteItem={onDeleteItem}
                onEditItem={onEditItem}
                onSendNow={onSendNow}
                editPending={pendingEditQueueItemId === item.queueItemId}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
}

export const ConversationQueuePanel = memo(ConversationQueuePanelImpl);
