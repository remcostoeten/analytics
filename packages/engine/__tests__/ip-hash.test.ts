import { describe, expect, test } from "bun:test";

import { memoryHasher } from "../src/adapters/memory";
import { webCryptoHasher } from "../src/adapters/system";
import { hashIp, ipSecretProblem } from "../src/utilities/ip-hash";

const secret = "s".repeat(32);

describe("hashIp", () => {
  test.each([
    [
      "an address",
      "81.2.69.160",
      "sha256(81.2.69.160sha256(ssssssssssssssssssssssssssssssss2026-09-28))",
    ],
    ["no address", null, null],
  ])("%s", async (_, ip, expected) => {
    expect(await hashIp(memoryHasher(), secret, ip, "2026-09-28T23:59:59.000Z")).toBe(expected);
  });

  test("rotates with the UTC day", async () => {
    const hasher = webCryptoHasher();
    const monday = await hashIp(hasher, secret, "81.2.69.160", "2026-09-28T12:00:00.000Z");
    const later = await hashIp(hasher, secret, "81.2.69.160", "2026-09-28T23:00:00.000Z");
    const tuesday = await hashIp(hasher, secret, "81.2.69.160", "2026-09-29T00:00:00.000Z");
    expect(monday).toBe(later);
    expect(monday).not.toBe(tuesday);
  });
});

describe("ipSecretProblem", () => {
  test.each([
    ["missing", "", "IP hash secret is not set"],
    ["placeholder", "default-secret-change-me", "IP hash secret is still the placeholder value"],
    ["short", "short", "IP hash secret is 5 characters; at least 32 are required"],
    ["strong", secret, null],
  ])("%s", (_, value, expected) => {
    expect(ipSecretProblem(value)).toBe(expected);
  });
});
