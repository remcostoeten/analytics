/**
 * @name noop
 * @description Does nothing. Call it where an error or callback is ignored on purpose, so the
 * decision is visible in the code and `house/no-silent-catch` passes.
 *
 * @example
 * try {
 *   localStorage.removeItem(key);
 * } catch {
 *   noop();
 * }
 */
export function noop(): void {}
