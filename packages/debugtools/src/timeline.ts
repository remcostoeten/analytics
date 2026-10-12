import type { Milliseconds } from "@spoar/shared/semantic";

import type { ConsoleData } from "./types";

export type Pace = {
  start: Milliseconds;
  queryChar: Milliseconds;
  run: Milliseconds;
  promptChar: Milliseconds;
  submit: Milliseconds;
  think: Milliseconds;
  step: Milliseconds;
  pause: Milliseconds;
  followUpChar: Milliseconds;
  hold: Milliseconds;
};

export type ScriptLengths = {
  query: number;
  prompt: number;
  steps: number;
  followUp: number;
};

export type Frame = {
  queryChars: number;
  running: boolean;
  promptChars: number;
  submitted: boolean;
  steps: number;
  followUpChars: number;
};

export const defaultPace: Pace = {
  start: 600,
  queryChar: 26,
  run: 900,
  promptChar: 36,
  submit: 350,
  think: 1100,
  step: 650,
  pause: 900,
  followUpChar: 70,
  hold: 4500,
};

/**
 * @name scriptLengths
 * @description Counts what the console types and reveals: query characters (lines joined by
 * newlines), prompt characters, agent steps and follow-up characters.
 *
 * @example
 * scriptLengths(consoleFixture);
 * // { query: 112, prompt: 42, steps: 7, followUp: 35 }
 */
export function scriptLengths(data: ConsoleData): ScriptLengths {
  return {
    query: data.query.join("\n").length,
    prompt: data.agent.prompt.length,
    steps: data.agent.steps.length,
    followUp: data.agent.followUp.length,
  };
}

function progress(elapsed: Milliseconds, unit: Milliseconds, total: number) {
  if (elapsed < 0) return 0;
  if (unit <= 0) return total;
  return Math.min(total, Math.floor(elapsed / unit));
}

/**
 * @name cycleLength
 * @description The time one full playback takes, from the empty editor to the end of the hold
 * after the follow-up prompt is typed.
 *
 * @example
 * cycleLength(scriptLengths(consoleFixture), defaultPace);
 */
export function cycleLength(lengths: ScriptLengths, pace: Pace): Milliseconds {
  return (
    pace.start +
    lengths.query * pace.queryChar +
    pace.run +
    lengths.prompt * pace.promptChar +
    pace.submit +
    pace.think +
    lengths.steps * pace.step +
    pace.pause +
    lengths.followUp * pace.followUpChar +
    pace.hold
  );
}

/**
 * @name frameAt
 * @description Derives what the console shows at a point in the playback: how much of the query
 * and prompts is typed, whether the query is running, whether the prompt is submitted and how
 * many agent steps are visible.
 *
 * @example
 * frameAt(scriptLengths(data), 4000, defaultPace).queryChars;
 */
export function frameAt(lengths: ScriptLengths, elapsed: Milliseconds, pace: Pace): Frame {
  let rest = elapsed - pace.start;
  const queryChars = progress(rest, pace.queryChar, lengths.query);
  rest -= lengths.query * pace.queryChar;
  const running = rest >= 0 && rest < pace.run;
  rest -= pace.run;
  const promptChars = progress(rest, pace.promptChar, lengths.prompt);
  rest -= lengths.prompt * pace.promptChar + pace.submit;
  const submitted = rest >= 0;
  rest -= pace.think;
  const steps = rest >= 0 ? progress(rest + pace.step, pace.step, lengths.steps) : 0;
  rest -= lengths.steps * pace.step + pace.pause;
  const followUpChars = progress(rest, pace.followUpChar, lengths.followUp);
  return { queryChars, running, promptChars, submitted, steps, followUpChars };
}
