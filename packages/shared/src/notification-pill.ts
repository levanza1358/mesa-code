import { z } from "zod";

const boundedText = z.string().max(512);
// A bounded, single-line-safe question answer surface (docs/specs/notification-pill-overlay.md).
// The pill only offers questions whose options are fixed pick-one/pick-many choices with no rich
// preview; the renderer that owns the interaction decides which questions qualify.
export const notificationPillAnswerQuestionSchema = z
  .object({
    question: z.string().min(1).max(512),
    header: z.string().max(64),
    multiSelect: z.boolean(),
    options: z
      .array(
        z
          .object({
            value: z.string().min(1).max(256),
            label: z.string().min(1).max(512),
          })
          .strict(),
      )
      .min(2)
      .max(4),
  })
  .strict();
export const notificationPillAnswerPromptSchema = z
  .object({
    showLabel: z.string().min(1).max(64),
    submitLabel: z.string().min(1).max(64),
    questions: z.array(notificationPillAnswerQuestionSchema).min(1).max(4),
  })
  .strict();
export type NotificationPillAnswerPrompt = z.infer<typeof notificationPillAnswerPromptSchema>;
// One answered question: the question text plus the chosen option value(s). The panel never
// collects free-text; values must match the prompt's fixed options.
export const notificationPillAnswerSelectionSchema = z
  .object({
    question: z.string().min(1).max(512),
    values: z.array(z.string().min(1).max(256)).min(1).max(4),
  })
  .strict();
export const notificationPillPositionSchema = z.enum([
  "top-center",
  "top-right",
  "bottom-center",
  "bottom-left",
]);
export type NotificationPillPosition = z.infer<typeof notificationPillPositionSchema>;
export const notificationPillContextSchema = z
  .object({
    taskId: z.string().min(1).max(256),
    workspacePath: z.string().min(1).max(4096),
    workspaceIdentity: z.string().max(4096).optional(),
    remoteSessionId: z.string().max(256).optional(),
    requestId: z.string().max(256).optional(),
    logEpoch: z.string().max(256).optional(),
    revision: z.number().int().nonnegative().optional(),
  })
  .strict();
export const notificationPillPresentationSchema = z
  .object({
    token: z.string().min(1).max(256),
    context: notificationPillContextSchema,
    kind: z.enum(["status", "permission"]),
    title: boundedText,
    body: boundedText,
    preview: z.string().max(120),
    openLabel: boundedText,
    error: boundedText,
    busy: z.boolean(),
    // Additive (docs/specs/notification-settings.md rule 6): when absent the overlay keeps its
    // legacy top-center anchor and 8000 ms auto-dismiss, so an older renderer is not broken.
    position: notificationPillPositionSchema.optional(),
    durationMs: z.number().int().min(1000).max(60_000).optional(),
    // Additive answer surface for userInput (AskUserQuestion) requests: present when the request is
    // answerable from the pill's expandable panel. Absent keeps the Open-only behavior.
    answerPrompt: notificationPillAnswerPromptSchema.optional(),
    options: z
      .array(
        z
          .object({
            optionId: z.string().min(1).max(256),
            kind: z.enum(["allowOnce", "deny"]),
            label: boundedText,
          })
          .strict(),
      )
      .max(2),
    appearance: z
      .object({
        background: z.string().max(128),
        foreground: z.string().max(128),
        border: z.string().max(128),
        accent: z.string().max(128),
        fontSize: z.string().max(32),
      })
      .strict(),
  })
  .strict();
export const notificationPillPublicationSchema = z
  .object({
    token: z.string().min(1).max(256),
    presentation: notificationPillPresentationSchema.optional(),
  })
  .strict()
  .refine((value) => !value.presentation || value.presentation.token === value.token);
export const notificationPillActionSchema = z
  .object({
    token: z.string().min(1).max(256),
    // "reveal" opens the answer panel from the compact pill; "answer" submits from either window;
    // "open" restores the source window.
    action: z.enum(["open", "answer", "reveal"]),
    optionId: z.string().min(1).max(256).optional(),
    // Additive: the fixed-option answer selections a userInput answer panel submits. Bounded like
    // answerPrompt; the owning renderer re-validates every value against the live request.
    answers: z.array(notificationPillAnswerSelectionSchema).min(1).max(4).optional(),
  })
  .strict();
export type NotificationPillPresentation = z.infer<typeof notificationPillPresentationSchema>;
export type NotificationPillPublication = z.infer<typeof notificationPillPublicationSchema>;
export type NotificationPillAction = z.infer<typeof notificationPillActionSchema>;
export const notificationPillActionReplySchema = notificationPillActionSchema
  .extend({ context: notificationPillContextSchema })
  .strict();
export type NotificationPillActionReply = z.infer<typeof notificationPillActionReplySchema>;
export const NotificationPillChannels = {
  publish: "mesaCode:notification-pill-publish",
  state: "mesaCode:notification-pill-state",
  action: "mesaCode:notification-pill-action",
  reply: "mesaCode:notification-pill-reply",
  // Main → answer-panel window: the current presentation while the panel is open.
  panelState: "mesaCode:notification-pill-panel-state",
} as const;
