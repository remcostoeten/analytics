import type { Nullable } from "@remcostoeten/analytics-shared/semantic";

export type HeaderBag = {
  get: (name: string) => Nullable<string>;
};

/**
 * @name clientIp
 * @description Reads the visitor's IP from the request headers: `cf-connecting-ip`, then
 * `x-real-ip`, then the first `x-forwarded-for` entry. Cloudflare sits in front of Vercel, where
 * `x-real-ip` holds the Cloudflare edge node, so `cf-connecting-ip` must stay first.
 *
 * @example
 * clientIp(new Headers({ "x-forwarded-for": "81.2.69.160, 10.0.0.1" })); // "81.2.69.160"
 */
export function clientIp(headers: HeaderBag): Nullable<string> {
  const cloudflare = headers.get("cf-connecting-ip");
  if (cloudflare) return cloudflare;
  const real = headers.get("x-real-ip");
  if (real) return real;
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
}
