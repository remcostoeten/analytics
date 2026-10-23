export type Keys = {
  project: string;
  endpoint: string;
  publicKey: string;
  secretKey: string | null;
};

/**
 * @name envBlock
 * @description The environment lines a site needs to send events, in the names the SDK reads:
 * `NEXT_PUBLIC_SPOAR_CONFIG` for the browser, `SPOAR_SECRET` when the secret key was just created or
 * rotated, and `SPOAR_ENDPOINT` for the proxy.
 *
 * @example
 * envBlock({ project: "example.com", endpoint, publicKey: "pk_live_...", secretKey: null });
 * // "NEXT_PUBLIC_SPOAR_CONFIG='{\"project\":\"example.com\",...}'\nSPOAR_ENDPOINT=..."
 */
export function envBlock(keys: Keys) {
  const config = JSON.stringify({ project: keys.project, key: keys.publicKey, endpoint: "/_ra" });
  const entries = [`NEXT_PUBLIC_SPOAR_CONFIG='${config}'`];
  if (keys.secretKey !== null) entries.push(`SPOAR_SECRET=${keys.secretKey}`);
  entries.push(`SPOAR_ENDPOINT=${keys.endpoint}`);
  return entries.join("\n");
}
