import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { maxmindGeo } from "../src/adapters/maxmind";
import { fixedClock, memoryLimiter } from "../src/adapters/memory";
import { jsonLogger, webCryptoHasher } from "../src/adapters/system";

describe("webCryptoHasher", () => {
  test("hashes with sha256", async () => {
    expect(await webCryptoHasher().sha256("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});

describe("jsonLogger", () => {
  test("writes one JSON line with the base fields", () => {
    const lines: string[] = [];
    const logger = jsonLogger((line) => lines.push(line), { requestId: "req_1" });
    logger.warn("rate limited", { project: "skriuw" });
    expect(lines.map((line) => JSON.parse(line))).toEqual([
      { level: "warn", message: "rate limited", requestId: "req_1", project: "skriuw" },
    ]);
  });
});

describe("memoryLimiter", () => {
  test("allows up to the limit per window, then reports the wait", async () => {
    const limiter = memoryLimiter(fixedClock(new Date("2026-09-27T16:40:15.000Z")));
    const decisions = [];
    for (let hit = 0; hit < 3; hit += 1) decisions.push(await limiter.hit("ip:a", 2, 60));
    expect(decisions).toEqual([
      { allowed: true, hits: 1, retryAfterSeconds: 0 },
      { allowed: true, hits: 2, retryAfterSeconds: 0 },
      { allowed: false, hits: 3, retryAfterSeconds: 45 },
    ]);
    expect((await limiter.hit("ip:b", 2, 60)).allowed).toBe(true);
  });
});

describe("maxmindGeo", () => {
  const city = readFileSync(join(import.meta.dir, "fixtures", "GeoIP2-City-Test.mmdb"));
  const geo = maxmindGeo(city, null);

  test("looks up a known address", () => {
    expect(geo.lookup("81.2.69.160")).toEqual({
      geo: {
        country: "GB",
        region: "ENG",
        regionId: 6269131,
        city: "London",
        cityId: 2643743,
        postalCode: null,
        timezone: "Europe/London",
        latitude: 51.5142,
        longitude: -0.0931,
        accuracyKm: 100,
        continent: "EU",
      },
      network: { asn: null, asOrg: null },
      places: [
        {
          id: 2635167,
          kind: "country",
          country: "GB",
          names: {
            en: "United Kingdom",
            de: "Vereinigtes Königreich",
            es: "Reino Unido",
            fr: "Royaume-Uni",
            ja: "イギリス",
            "pt-BR": "Reino Unido",
            ru: "Великобритания",
            "zh-CN": "英国",
          },
        },
        {
          id: 6269131,
          kind: "region",
          country: "GB",
          names: { en: "England", es: "Inglaterra", fr: "Angleterre", "pt-BR": "Inglaterra" },
        },
        {
          id: 2643743,
          kind: "city",
          country: "GB",
          names: {
            en: "London",
            de: "London",
            es: "Londres",
            fr: "Londres",
            ja: "ロンドン",
            "pt-BR": "Londres",
            ru: "Лондон",
          },
        },
      ],
    });
  });

  test("reports when MaxMind built the database", () => {
    expect(geo.builtAt).toBe("2026-02-04T22:49:29.000Z");
  });

  test("returns nulls and no places for an unknown address", () => {
    const record = geo.lookup("10.0.0.1");
    expect(record.geo.country).toBeNull();
    expect(record.places).toEqual([]);
  });

  test("returns nulls for a malformed address", () => {
    expect(geo.lookup("not-an-ip").geo.country).toBeNull();
  });
});
