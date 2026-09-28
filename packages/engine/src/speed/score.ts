export type VitalName = "lcp" | "inp" | "cls" | "fcp" | "ttfb";

export type VitalRating = "good" | "needs-improvement" | "poor";

type Threshold = { good: number; poor: number; weight: number };

/**
 * @name vitalThresholds
 * @description Good-up-to and poor-from values per metric, in milliseconds (CLS unitless), and
 * each metric's weight in the Real Experience Score; TTFB is shown but not scored.
 *
 * @example
 * vitalThresholds.lcp.good; // 2500
 */
export const vitalThresholds: { [Name in VitalName]: Threshold } = {
  lcp: { good: 2500, poor: 4000, weight: 0.3 },
  inp: { good: 200, poor: 500, weight: 0.3 },
  cls: { good: 0.1, poor: 0.25, weight: 0.25 },
  fcp: { good: 1800, poor: 3000, weight: 0.15 },
  ttfb: { good: 800, poor: 1800, weight: 0 },
};

const tenthQuantile = 1.2815515655446004;

/**
 * @name erfc
 * @description The complementary error function, by the Abramowitz and Stegun 7.1.26
 * approximation, accurate to about 1e-7.
 *
 * @example
 * erfc(0); // 1
 */
function erfc(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const poly =
    t *
    (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const value = poly * Math.exp(-x * x);
  return x >= 0 ? value : 2 - value;
}

/**
 * @name vitalRating
 * @description A value's rating: good up to the good threshold, poor above the poor one.
 *
 * @example
 * vitalRating("lcp", 2710); // "needs-improvement"
 */
export function vitalRating(metric: VitalName, value: number): VitalRating {
  const threshold = vitalThresholds[metric];
  if (value <= threshold.good) return "good";
  return value <= threshold.poor ? "needs-improvement" : "poor";
}

/**
 * @name metricScore
 * @description A metric value scored 0 to 100 on a log-normal curve, as Lighthouse scores: the
 * poor threshold is the median and scores 50, the good threshold scores 90. Null for TTFB, which
 * is not scored.
 *
 * @example
 * metricScore("lcp", 2500); // 90
 */
export function metricScore(metric: VitalName, value: number): number | null {
  const threshold = vitalThresholds[metric];
  if (threshold.weight === 0) return null;
  if (value <= 0) return 100;
  const median = Math.log(threshold.poor);
  const sigma = (median - Math.log(threshold.good)) / tenthQuantile;
  const standard = (Math.log(value) - median) / (sigma * Math.SQRT2);
  return Math.round(Math.min(1, Math.max(0, erfc(standard) / 2)) * 100);
}

/**
 * @name experienceScore
 * @description The Real Experience Score: the weighted mean of the scored metrics that have a
 * value (LCP 30%, INP 30%, CLS 25%, FCP 15%), with the weights of missing metrics spread over the
 * rest. Null when no scored metric has a value.
 *
 * @example
 * experienceScore({ lcp: 90, inp: 90, cls: 90, fcp: 90 }); // 90
 */
export function experienceScore(scores: { [Name in VitalName]?: number | null }): number | null {
  let total = 0;
  let weights = 0;
  for (const [name, threshold] of Object.entries(vitalThresholds)) {
    const score = scores[name as VitalName];
    if (threshold.weight > 0 && typeof score === "number") {
      total += score * threshold.weight;
      weights += threshold.weight;
    }
  }
  return weights > 0 ? Math.round(total / weights) : null;
}

/**
 * @name scoreRating
 * @description The band a score falls in: 90 to 100 good, 50 to 89 needs improvement, under 50
 * poor.
 *
 * @example
 * scoreRating(86); // "needs-improvement"
 */
export function scoreRating(score: number): VitalRating {
  if (score >= 90) return "good";
  return score >= 50 ? "needs-improvement" : "poor";
}
