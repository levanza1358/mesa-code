/**
 * Tracks, per interaction, whether the user interacted with a dialog and whether an auto-resolution
 * snooze has already been sent. Extracted from V4InteractionDialogs so the dialog component stays
 * focused on wiring; the state is renderer-local and never persisted.
 */
export interface InteractionAutoResolutionIntentTracker {
  markInteracted(interactionId: string): void;
  consumeSnooze(interactionId: string, autoResolutionReady: boolean): boolean;
  releaseSnooze(interactionId: string): void;
}

export function createInteractionAutoResolutionIntentTracker(): InteractionAutoResolutionIntentTracker {
  const interactedIds = new Set<string>();
  const sentIds = new Set<string>();
  return {
    markInteracted(interactionId) {
      interactedIds.add(interactionId);
    },
    consumeSnooze(interactionId, autoResolutionReady) {
      if (!autoResolutionReady || !interactedIds.has(interactionId) || sentIds.has(interactionId)) {
        return false;
      }
      sentIds.add(interactionId);
      return true;
    },
    releaseSnooze(interactionId) {
      sentIds.delete(interactionId);
    },
  };
}
