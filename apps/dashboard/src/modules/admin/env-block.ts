export type Keys = {
  endpoint: string;
  publicKey: string;
  secretKey: string | null;
};

/**
 * @name envBlock
 * @description The environment lines a site needs to send events: the API endpoint, the public
 * browser key and, when it was just created or rotated, the secret server key.
 *
 * @example
 * envBlock({ endpoint, publicKey: "pk_live_...", secretKey: null });
 * // "NEXT_PUBLIC_SPOAR_ENDPOINT=...\nNEXT_PUBLIC_SPOAR_KEY=pk_live_..."
 */
export function envBlock(keys: Keys) {
  const entries = [
    `NEXT_PUBLIC_SPOAR_ENDPOINT=${keys.endpoint}`,
    `NEXT_PUBLIC_SPOAR_KEY=${keys.publicKey}`,
  ];
  if (keys.secretKey !== null) entries.push(`SPOAR_SECRET_KEY=${keys.secretKey}`);
  return entries.join("\n");
}
