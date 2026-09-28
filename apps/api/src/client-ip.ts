import type { Nullable } from "@remcostoeten/analytics-shared/semantic";

type IpHeader = "cf-connecting-ip" | "x-real-ip" | "x-forwarded-for";

export type ClientIp = {
  ip: Nullable<string>;
  header: Nullable<IpHeader>;
};

const ipHeaders: IpHeader[] = ["cf-connecting-ip", "x-real-ip", "x-forwarded-for"];

/**
 * @name clientIp
 * @description Picks the caller's IP from `cf-connecting-ip`, then `x-real-ip`, then the first
 * entry of `x-forwarded-for`, and reports which header supplied it.
 *
 * @example
 * clientIp(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }));
 * // { ip: "203.0.113.7", header: "x-forwarded-for" }
 */
export function clientIp(headers: Headers): ClientIp {
  for (const header of ipHeaders) {
    const value = headers.get(header)?.split(",")[0]?.trim();
    if (value) return { ip: value, header };
  }
  return { ip: null, header: null };
}
