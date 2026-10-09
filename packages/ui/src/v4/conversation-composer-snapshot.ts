import type { ConversationSnapshot } from "@mesa-code/shared/mesa-code-protocol-v4";

export type ConversationComposerSnapshot = Pick<
  ConversationSnapshot,
  | "inputRouting"
  | "control"
  | "config"
  | "usage"
  | "queue"
  | "backgroundWorks"
  | "sharedContextImport"
> & { rows: Pick<ConversationSnapshot["rows"], "totalCount"> };

export function projectConversationComposerSnapshot(
  snapshot: ConversationSnapshot | null,
): ConversationComposerSnapshot | null {
  if (!snapshot) return null;
  return {
    inputRouting: snapshot.inputRouting,
    control: snapshot.control,
    config: snapshot.config,
    usage: snapshot.usage,
    queue: snapshot.queue,
    backgroundWorks: snapshot.backgroundWorks,
    sharedContextImport: snapshot.sharedContextImport,
    rows: { totalCount: snapshot.rows.totalCount },
  };
}

export function composerSnapshotsEqual(
  previous: ConversationComposerSnapshot | null,
  next: ConversationComposerSnapshot | null,
): boolean {
  if (previous === next) return true;
  if (!previous || !next) return false;
  return (
    previous.inputRouting === next.inputRouting &&
    previous.control === next.control &&
    previous.config === next.config &&
    previous.usage === next.usage &&
    previous.queue === next.queue &&
    previous.backgroundWorks === next.backgroundWorks &&
    previous.sharedContextImport === next.sharedContextImport &&
    previous.rows.totalCount === next.rows.totalCount
  );
}
