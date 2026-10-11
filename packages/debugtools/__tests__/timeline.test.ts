import { describe, expect, test } from "bun:test";

import { consoleFixture } from "../src/fixtures";
import { cycleLength, defaultPace, frameAt, scriptLengths } from "../src/timeline";

const lengths = scriptLengths(consoleFixture);
const cycle = cycleLength(lengths, defaultPace);

describe("frameAt", () => {
  test("starts with nothing typed", () => {
    expect(frameAt(lengths, 0, defaultPace)).toEqual({
      queryChars: 0,
      running: false,
      promptChars: 0,
      submitted: false,
      steps: 0,
      followUpChars: 0,
    });
  });

  test("types the query before anything else", () => {
    const frame = frameAt(lengths, defaultPace.start + 10 * defaultPace.queryChar, defaultPace);
    expect(frame.queryChars).toBe(10);
    expect(frame.promptChars).toBe(0);
  });

  test("runs the query once it is typed", () => {
    const typed = defaultPace.start + lengths.query * defaultPace.queryChar;
    expect(frameAt(lengths, typed, defaultPace).running).toBe(true);
    expect(frameAt(lengths, typed + defaultPace.run, defaultPace).running).toBe(false);
  });

  test("ends fully typed at the start of the hold", () => {
    expect(frameAt(lengths, cycle - defaultPace.hold, defaultPace)).toEqual({
      queryChars: lengths.query,
      running: false,
      promptChars: lengths.prompt,
      submitted: true,
      steps: lengths.steps,
      followUpChars: lengths.followUp,
    });
  });

  test("reveals steps one at a time after thinking", () => {
    const thinkingDone =
      defaultPace.start +
      lengths.query * defaultPace.queryChar +
      defaultPace.run +
      lengths.prompt * defaultPace.promptChar +
      defaultPace.submit +
      defaultPace.think;
    expect(frameAt(lengths, thinkingDone - 1, defaultPace).steps).toBe(0);
    expect(frameAt(lengths, thinkingDone, defaultPace).steps).toBe(1);
    expect(frameAt(lengths, thinkingDone + defaultPace.step, defaultPace).steps).toBe(2);
  });

  test("shows everything at once when every pace is zero", () => {
    const instant = {
      ...defaultPace,
      start: 0,
      queryChar: 0,
      run: 0,
      promptChar: 0,
      submit: 0,
      think: 0,
      step: 0,
      pause: 0,
      followUpChar: 0,
    };
    expect(frameAt(lengths, 0, instant).steps).toBe(lengths.steps);
  });
});
