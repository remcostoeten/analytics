import type { BotLabel, BotSignals } from "@spoar/contract";
import type { Nullable } from "@spoar/shared/semantic";

import type { EventDraft } from "../draft";

export const botScoreFloor = 50;
const suspectScoreFloor = 25;

const unscoredSignals: BotSignals = {
  headless: null,
  webdriver: null,
  datacenterAsn: null,
  pointerEvents: null,
  uaMismatch: null,
  uniformDwell: null,
};

/**
 * @name botLabel
 * @description The verdict for a bot score: `bot` from 50, the threshold rescoring, reads and the
 * stored `bot_detected` flag use, `suspect` from 25, the weight of a single client hint, and
 * `human` below that.
 *
 * @example
 * botLabel(40); // "suspect"
 */
export function botLabel(score: number): BotLabel {
  if (score >= botScoreFloor) return "bot";
  return score >= suspectScoreFloor ? "suspect" : "human";
}

function reported(draft: EventDraft, fired: boolean): Nullable<boolean> {
  return draft.event.signals === undefined ? null : fired;
}

/**
 * @name signalBreakdown
 * @description Which checks flagged a scored draft, from its reasons: each field is true when the
 * check fired, false when it ran and passed, and null when it could not run. The client hints
 * need the SDK's `signals` bits, `datacenterAsn` a known ASN and `uaMismatch` a user agent on an
 * untrusted request; `uniformDwell` is set later by the session job. `pointerEvents` is true when
 * no pointer, key, touch or scroll input was seen.
 *
 * @example
 * signalBreakdown(draft, ["client_headless"]).headless; // true
 */
export function signalBreakdown(draft: EventDraft, reasons: readonly string[]): BotSignals {
  function fired(name: string) {
    return reasons.includes(name);
  }
  const asn = draft.enrichment.network?.asn ?? null;
  const checkable = !draft.trusted && draft.enrichment.client.userAgent !== null;
  return {
    headless: reported(draft, fired("client_headless")),
    webdriver: reported(draft, fired("client_webdriver")),
    datacenterAsn: asn === null ? null : fired("asn_datacenter"),
    pointerEvents: reported(draft, fired("client_no_input")),
    uaMismatch: checkable ? fired("headers_inconsistent") : null,
    uniformDwell: fired("session_velocity") ? true : null,
  };
}

/**
 * @name storedSignals
 * @description Reads a stored `bot_signals` value back into a breakdown, with null for every
 * field that was not recorded, so rows stored before the column existed answer all nulls.
 *
 * @example
 * storedSignals(null); // every field null
 */
export function storedSignals(value: unknown): BotSignals {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return unscoredSignals;
  const entries = new Map(Object.entries(value));
  function flag(name: keyof BotSignals): Nullable<boolean> {
    const found = entries.get(name);
    return typeof found === "boolean" ? found : null;
  }
  return {
    headless: flag("headless"),
    webdriver: flag("webdriver"),
    datacenterAsn: flag("datacenterAsn"),
    pointerEvents: flag("pointerEvents"),
    uaMismatch: flag("uaMismatch"),
    uniformDwell: flag("uniformDwell"),
  };
}
