import type { EventDraft } from "./draft";

export type Deduped = {
  unique: EventDraft[];
  repeated: number;
};

/**
 * @name dedupeBatch
 * @description The in-batch half of the dedupe stage: keeps the first draft of each event id and
 * counts the repeats. Ids already stored are caught by the unique index when the batch is
 * persisted.
 *
 * @example
 * dedupeBatch([first, sameIdAgain]); // { unique: [first], repeated: 1 }
 */
export function dedupeBatch(drafts: EventDraft[]): Deduped {
  const seen = new Set<string>();
  const unique: EventDraft[] = [];
  for (const draft of drafts) {
    if (seen.has(draft.event.id)) continue;
    seen.add(draft.event.id);
    unique.push(draft);
  }
  return { unique, repeated: drafts.length - unique.length };
}
