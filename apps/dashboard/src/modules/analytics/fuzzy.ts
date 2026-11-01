const diacritics = /\p{M}/gu;

function normalise(value: string) {
  return value.normalize("NFD").replace(diacritics, "").toLowerCase().trim();
}

/**
 * @name fuzzyScore
 * @description Scores how well a query matches a text, ignoring case and accents, or returns
 * null when it does not match. Exact and prefix matches rank first, then substrings, then
 * in-order letters scattered through the text, favouring runs and word starts.
 *
 * @example
 * fuzzyScore("usa", "United States of America"); // a number
 * fuzzyScore("zzz", "Netherlands"); // null
 */
export function fuzzyScore(query: string, text: string): number | null {
  const needle = normalise(query);
  const hay = normalise(text);
  if (needle === "") return 0;
  if (hay === needle) return 1000;
  if (hay.startsWith(needle)) return 900 - hay.length;
  const at = hay.indexOf(needle);
  if (at >= 0) return 800 - at - hay.length / 10;
  let score = 0;
  let from = 0;
  let previous = -2;
  for (const letter of needle) {
    const found = hay.indexOf(letter, from);
    if (found < 0) return null;
    const wordStart = found === 0 || hay[found - 1] === " ";
    score += 10 + (found === previous + 1 ? 15 : 0) + (wordStart ? 20 : 0) - (found - from);
    previous = found;
    from = found + 1;
  }
  return score;
}
