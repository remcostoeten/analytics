/**
 * @name randomSecret
 * @description A prefixed random value with `bytes` bytes of entropy in hex, for keys, tokens and
 * their ids.
 *
 * @example
 * randomSecret("tok_", 4); // "tok_9f3a1c2e"
 */
export function randomSecret(prefix: string, bytes: number): string {
  const values = crypto.getRandomValues(new Uint8Array(bytes));
  return prefix + Array.from(values, (value) => value.toString(16).padStart(2, "0")).join("");
}
