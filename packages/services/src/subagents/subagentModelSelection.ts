import { modelSelectionSchema, type ModelSelection } from "@mesa-code/shared";

export function normalizeSubagentModelSelection(
  selection: ModelSelection | undefined,
): ModelSelection | undefined {
  if (!selection) return undefined;
  const options = selection.options;
  return modelSelectionSchema.parse({
    providerId: selection.providerId,
    modelId: selection.modelId,
    ...(options?.reasoningLevel ? { options: { reasoningLevel: options.reasoningLevel } } : {}),
  });
}
