import type { BotVerdict } from "@spoar/contract";
import { ok } from "@spoar/shared/result";

import { defineStage } from "../define";
import type { Signal } from "../define";
import type { EventDraft } from "../draft";
import { signalBreakdown } from "../signals/verdict";

const maxScore = 100;

function fires(signal: Signal, draft: EventDraft) {
  if (draft.replay && !signal.replayable) return draft.bot.reasons.includes(signal.name);
  return signal.detect(draft);
}

/**
 * @name scoreBot
 * @description Sums the weights of the signals that fire, capped at 100, and lists them as
 * reasons. On a replayed draft a signal whose inputs are not stored counts only when the draft
 * already had its reason.
 *
 * @example
 * scoreBot(defaultSignals, draft); // { score: 100, reasons: ["ua_automation"] }
 */
export function scoreBot(signals: Signal[], draft: EventDraft): BotVerdict {
  const firing = signals.filter((signal) => fires(signal, draft));
  return {
    score: Math.min(
      maxScore,
      firing.reduce((total, signal) => total + signal.weight, 0),
    ),
    reasons: firing.map((signal) => signal.name),
  };
}

/**
 * @name botScoreStage
 * @description Scores the draft with every registered signal through `scoreBot` and keeps the
 * breakdown of which checks fired, ran or could not run, which is stored as `bot_signals`. It
 * reruns on `engine.rescore` after a signal changes.
 *
 * @example
 * createEngine(ports, { stages: [enrichStage, botScoreStage], signals: defaultSignals, enrichers: [], dimensions: [] }, settings);
 */
export const botScoreStage = defineStage({
  name: "bot-score",
  rescores: true,
  run: (draft, context) => {
    const verdict = scoreBot(context.registry.signals, draft);
    return ok({ ...draft, bot: { ...verdict, signals: signalBreakdown(draft, verdict.reasons) } });
  },
});
