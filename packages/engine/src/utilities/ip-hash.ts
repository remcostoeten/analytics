import type { Nullable, Timestamp } from "@spoar/shared/semantic";

import type { Hasher } from "../ports";

const minimumSecretLength = 32;
const placeholderSecret = "default-secret-change-me";

/**
 * @name ipSecretProblem
 * @description Says why an IP hash secret is unsafe, or returns null when it is fine. A guessable
 * secret makes the stored hash reversible by brute-forcing the address space, so hosts refuse to
 * start in production when this returns a reason.
 *
 * @example
 * ipSecretProblem("short"); // "IP hash secret is 5 characters; at least 32 are required"
 */
export function ipSecretProblem(secret: string): Nullable<string> {
  if (!secret) return "IP hash secret is not set";
  if (secret === placeholderSecret) return "IP hash secret is still the placeholder value";
  if (secret.length < minimumSecretLength) {
    return `IP hash secret is ${secret.length} characters; at least ${minimumSecretLength} are required`;
  }
  return null;
}

/**
 * @name hashIp
 * @description Hashes an IP as `sha256(ip + sha256(secret + day))`, where the day is the UTC date
 * of `at`. The salt rotates daily, so a hash cannot link a visitor across days. The raw IP is
 * never stored.
 *
 * @example
 * await hashIp(webCryptoHasher(), secret, "81.2.69.160", "2026-09-28T12:00:00.000Z");
 */
export async function hashIp(
  hasher: Hasher,
  secret: string,
  ip: Nullable<string>,
  at: Timestamp,
): Promise<Nullable<string>> {
  if (!ip) return null;
  const salt = await hasher.sha256(secret + at.slice(0, 10));
  return hasher.sha256(ip + salt);
}
