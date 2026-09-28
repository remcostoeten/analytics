import { ok } from "@remcostoeten/analytics-shared/result";

import { defineStage } from "../define";

const maxScore = 100;

/**
 * @name botScoreStage
 * @description Sums the weights of every registered signal that fires, capped at 100, and lists
 * the firing signals as reasons. It reruns on `engine.rescore` after a signal changes.
 *
 * @example
 * createEngine(ports, { stages: [enrichStage, botScoreStage], signals: [webdriver], enrichers: [], dimensions: [] });
 */
export const botScoreStage = defineStage({
  name: "bot-score",
  rescores: true,
  run: (draft, context) => {
    const firing = context.registry.signals.filter((signal) => signal.detect(draft));
    const score = Math.min(
      maxScore,
      firing.reduce((total, signal) => total + signal.weight, 0),
    );
    return ok({ ...draft, bot: { score, reasons: firing.map((signal) => signal.name) } });
  },
});
