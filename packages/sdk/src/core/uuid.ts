function hex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * @name uuidv7
 * @description A UUIDv7: 48 bits of Unix milliseconds, then random bits, so ids sort by creation
 * time. Events keep this id across retries, which lets the server drop duplicates.
 *
 * @example
 * uuidv7(Date.now()); // "01928c3e-7a4b-7c1d-9f00-2b7c1e5d8a11"
 */
export function uuidv7(now: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  for (let index = 0; index < 6; index += 1) {
    bytes[index] = Math.floor(now / 2 ** (8 * (5 - index))) % 256;
  }
  bytes[6] = ((bytes[6] ?? 0) % 16) + 0x70;
  bytes[8] = ((bytes[8] ?? 0) % 64) + 0x80;
  const text = hex(bytes);
  return `${text.slice(0, 8)}-${text.slice(8, 12)}-${text.slice(12, 16)}-${text.slice(16, 20)}-${text.slice(20)}`;
}
