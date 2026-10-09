import { z } from "zod";

const boundedText = z.string().max(512);
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
    action: z.enum(["open", "answer"]),
    optionId: z.string().min(1).max(256).optional(),
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
} as const;
