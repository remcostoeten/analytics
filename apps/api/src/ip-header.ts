import type { Nullable } from "@spoar/shared/semantic";

type IpHeader = "cf-connecting-ip" | "x-real-ip" | "x-forwarded-for";

const ipHeaders: IpHeader[] = ["cf-connecting-ip", "x-real-ip", "x-forwarded-for"];

/**
 * @name ipHeader
 * @description Names the header the engine takes the caller's IP from, in its order of
 * preference, without the address itself. Health reports it so a deploy can confirm that
 * `cf-connecting-ip` arrives behind Cloudflare.
 *
 * @example
 * ipHeader(new Headers({ "x-forwarded-for": "203.0.113.7" })); // "x-forwarded-for"
 */
export function ipHeader(headers: Headers): Nullable<IpHeader> {
  return ipHeaders.find((header) => headers.get(header)?.split(",")[0]?.trim()) ?? null;
}
