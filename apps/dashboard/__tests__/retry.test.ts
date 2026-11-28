import { expect, test } from "bun:test";

import { retryUnreached } from "../src/shared/query/retry";

type Answer = { ok: boolean; error?: { code: string } };

const blocked: Answer = { ok: false, error: { code: "NETWORK" } };

function script(...answers: Answer[]) {
  const waited: number[] = [];
  let calls = 0;
  return {
    waited,
    calls: () => calls,
    read: () => answers[Math.min(calls++, answers.length - 1)],
    wait: async (delay: number) => {
      waited.push(delay);
    },
  };
}

test("reads again until the API answers", async () => {
  const run = script(blocked, { ok: true });
  expect(await retryUnreached(run.read, run.wait)).toEqual({ ok: true });
  expect(run.waited).toEqual([3000]);
});

test("returns the failure after waiting longer than the 10 s block", async () => {
  const run = script(blocked);
  expect(await retryUnreached(run.read, run.wait)).toEqual(blocked);
  expect(run.calls()).toBe(3);
  expect(run.waited).toEqual([3000, 8000]);
});

test("leaves other failures alone", async () => {
  const refused: Answer = { ok: false, error: { code: "FORBIDDEN" } };
  const run = script(refused);
  expect(await retryUnreached(run.read, run.wait)).toEqual(refused);
  expect(run.calls()).toBe(1);
});
