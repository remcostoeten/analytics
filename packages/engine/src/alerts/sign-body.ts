const encoder = new TextEncoder();
const secretBytes = 32;

function hex(bytes: Uint8Array) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * @name signBody
 * @description The `x-analytics-signature` value for a webhook body: `sha256=` and the hex HMAC
 * of `<timestamp>.<body>` with the target's secret, where `timestamp` is Unix seconds.
 *
 * @example
 * await signBody('{"v":1}', "whsec_abc", 1790000000); // "sha256=5d1f..."
 */
export async function signBody(body: string, secret: string, timestamp: number) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(`${timestamp}.${body}`));
  return `sha256=${hex(new Uint8Array(signature))}`;
}

/**
 * @name webhookSecret
 * @description A new webhook signing secret: `whsec_` and 32 random bytes in hex.
 *
 * @example
 * webhookSecret(); // "whsec_9f86d081884c7d65..."
 */
export function webhookSecret() {
  return `whsec_${hex(crypto.getRandomValues(new Uint8Array(secretBytes)))}`;
}
