import { useEffect, useMemo, useRef, useState } from "react";
import type { IPlatformService, NotificationPillPresentation } from "@mesa-code/shared";
import type {
  ConversationSnapshot,
  PendingInteraction,
} from "@mesa-code/shared/mesa-code-protocol-v4";
import {
  isCurrentNotificationPillAnswer,
  notificationPillOptions,
  readNotificationPillAppearance,
} from "@/lib/notification-pill.js";
import { useMesaCodeIntl } from "@/i18n/IntlProvider.js";

export function useNotificationPill(params: {
  platform: IPlatformService | null | undefined;
  enabled: boolean;
  onRuntimeLifecycle?: (listener: (state: "available" | "unavailable") => void) => () => void;
  onRuntimeRestart: (listener: () => void) => () => void;
  snapshot: ConversationSnapshot | null;
  pending: PendingInteraction | null;
  workspacePath: string;
  workspaceIdentity?: string;
  remoteSessionId?: string;
  busy: boolean;
  failed: boolean;
  respond: (interactionId: string, optionId: string) => Promise<boolean>;
}) {
  const { intl } = useMesaCodeIntl();
  const {
    snapshot,
    pending,
    enabled,
    platform,
    workspacePath,
    workspaceIdentity,
    remoteSessionId,
    busy,
    failed,
    respond,
  } = params;
  const latestSnapshot = useRef(snapshot);
  latestSnapshot.current = snapshot;
  const [runtime, setRuntime] = useState<{
    available: boolean;
    invalidated?: ConversationSnapshot | null;
  }>({ available: true });
  useEffect(
    () =>
      params.onRuntimeLifecycle?.((state) =>
        setRuntime((previous) =>
          state === "available"
            ? { ...previous, available: true }
            : { available: false, invalidated: latestSnapshot.current },
        ),
      ),
    [params.onRuntimeLifecycle],
  );
  useEffect(
    () =>
      params.onRuntimeRestart(() =>
        setRuntime({
          available: false,
          invalidated: latestSnapshot.current,
        }),
      ),
    [params.onRuntimeRestart],
  );
  // Process availability is not projection freshness; even an unchanged epoch needs a new snapshot.
  const runtimeAvailable = runtime.available && snapshot !== runtime.invalidated;
  const inFlight = useRef(false);
  const [answerPending, setAnswerPending] = useState(false);
  const token = useMemo(
    () => crypto.randomUUID(),
    [
      snapshot?.sessionId,
      snapshot?.logEpoch,
      snapshot?.revision,
      pending?.interactionId,
      workspacePath,
      workspaceIdentity,
      remoteSessionId,
      enabled,
      runtimeAvailable,
    ],
  );
  const accepted = useRef<string | null>(null);
  const requestKey = presentationKey(snapshot, pending);
  function presentationKey(
    value: ConversationSnapshot | null,
    interaction: PendingInteraction | null,
  ) {
    return `${workspaceIdentity?.trim() || workspacePath}\0${remoteSessionId ?? ""}\0${value?.sessionId ?? ""}\0${value?.logEpoch ?? ""}\0${interaction?.interactionId ?? ""}`;
  }
  const presentation: NotificationPillPresentation | null =
    enabled && runtimeAvailable && snapshot && pending
      ? {
          token,
          context: {
            taskId: snapshot.sessionId,
            requestId: pending.interactionId,
            workspacePath,
            workspaceIdentity,
            remoteSessionId,
            logEpoch: snapshot.logEpoch,
            revision: snapshot.revision,
          },
          kind: "permission",
          title: intl.formatMessage({
            id:
              pending.payload.kind === "permission"
                ? "notification.permissionRequired"
                : "notification.inputRequired",
          }),
          body: (pending.payload.kind === "permission"
            ? pending.payload.summary
            : pending.payload.kind === "userInput"
              ? pending.payload.prompt
              : ""
          ).slice(0, 512),
          preview: "",
          options: notificationPillOptions(pending).map((option) => ({
            ...option,
            label: intl.formatMessage({
              id:
                option.kind === "allowOnce"
                  ? "notification.pill.allowOnce"
                  : "chat.permission.deny",
            }),
          })),
          openLabel: intl.formatMessage({ id: "notification.pill.open" }),
          error: failed ? intl.formatMessage({ id: "chat.permission.responseFailed" }) : "",
          busy: busy || answerPending,
          appearance: { background: "", foreground: "", border: "", accent: "", fontSize: "" },
        }
      : null;
  const current = useRef(presentation);
  current.current = presentation;
  const currentRequestKey = useRef(requestKey);
  currentRequestKey.current = requestKey;
  const respondRef = useRef(respond);
  respondRef.current = respond;
  useEffect(() => {
    if (!platform?.presentNotificationPill || !presentation || accepted.current === requestKey)
      return;
    const publish = () => {
      const value = current.current;
      if (value?.token === token && accepted.current !== requestKey)
        platform.presentNotificationPill?.({
          token,
          presentation: { ...value, appearance: readNotificationPillAppearance() },
        });
    };
    publish();
    const observer = new MutationObserver(publish);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });
    return () => observer.disconnect();
  }, [platform, token, enabled, pending, snapshot, intl, busy, failed, answerPending]);
  useEffect(
    () => () => {
      platform?.presentNotificationPill?.({ token });
    },
    [platform, token],
  );
  useEffect(
    () =>
      platform?.onNotificationPillAction?.((action) => {
        const value = current.current;
        // Validate the live renderer projection, not the main process's cached presentation.
        // Main may mark a raced replacement click busy before this listener rejects it.
        if (inFlight.current && value?.token === action.token) {
          platform.presentNotificationPill?.({
            token: value.token,
            presentation: {
              ...value,
              busy: true,
              appearance: readNotificationPillAppearance(),
            },
          });
          return;
        }
        if (
          !isCurrentNotificationPillAnswer(action, value) ||
          accepted.current === currentRequestKey.current ||
          !action.optionId ||
          !value?.context.requestId
        )
          return;
        inFlight.current = true;
        setAnswerPending(true);
        const answeredKey = currentRequestKey.current;
        void respondRef
          .current(value.context.requestId, action.optionId)
          .then((ok) => {
            if (ok) {
              accepted.current = answeredKey;
              platform.presentNotificationPill?.({ token: action.token });
              if (currentRequestKey.current === answeredKey && current.current)
                platform.presentNotificationPill?.({ token: current.current.token });
            } else if (current.current?.token === action.token) {
              platform.presentNotificationPill?.({
                token: action.token,
                presentation: {
                  ...current.current,
                  busy: false,
                  error: intl.formatMessage({ id: "chat.permission.responseFailed" }),
                  appearance: readNotificationPillAppearance(),
                },
              });
            }
          })
          .finally(() => {
            inFlight.current = false;
            setAnswerPending(false);
          });
      }),
    [platform, intl],
  );
}
