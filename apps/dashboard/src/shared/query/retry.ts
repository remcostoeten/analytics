import type { Milliseconds } from "@spoar/shared/semantic";

const retryDelaysMs: readonly Milliseconds[] = [3000, 8000];

function pause(delay: Milliseconds) {
  return new Promise<void>((resolve) => setTimeout(resolve, delay));
}

function unreached<Answer>(answer: Answer) {
  if (typeof answer !== "object" || answer === null || !("error" in answer)) return false;
  const { error } = answer;
  return typeof error === "object" && error !== null && "code" in error && error.code === "NETWORK";
}

/**
 * @name retryUnreached
 * @description Runs a read again while it answers with the client's `NETWORK` error, which is also
 * what an edge rate limit looks like in a browser, as its 429 carries no CORS headers. After the
 * last delay the failure is returned as it is.
 *
 * @example
 * const stats = await retryUnreached(() => scope.stats());
 */
export async function retryUnreached<Answer>(
  read: () => Answer | Promise<Answer>,
  wait: (delay: Milliseconds) => Promise<void> = pause,
) {
  let answer = await read();
  for (const delay of retryDelaysMs) {
    if (!unreached(answer)) break;
    await wait(delay);
    answer = await read();
  }
  return answer;
}
