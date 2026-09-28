/**
 * @name uuidv7
 * @description A UUIDv7: 48 bits of Unix milliseconds, then random bits, so ids sort by creation
 * time. Events keep this id across retries, which lets the server drop duplicates.
 *
 * @example
 * uuidv7(Date.now()); // "01928c3e-7a4b-7c1d-9f00-2b7c1e5d8a11"
 */
export function uuidv7(now: number): string {
  const random = Array.from(crypto.getRandomValues(new Uint8Array(10)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  const time = now.toString(16).padStart(12, "0");
  return `${time.slice(0, 8)}-${time.slice(8)}-7${random.slice(0, 3)}-${"89ab"[(random.codePointAt(3) ?? 0) % 4]}${random.slice(4, 7)}-${random.slice(8)}`;
}
