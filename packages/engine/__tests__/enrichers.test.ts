import { describe, expect, test } from "bun:test";

import { memoryGeo } from "../src/adapters/memory";
import type { StageContext } from "../src/define";
import { createDraft } from "../src/draft";
import type { EventDraft } from "../src/draft";
import { forwardedProxy } from "../src/enrichers/forwarded-proxy";
import { geo } from "../src/enrichers/geo";
import { ipHash } from "../src/enrichers/ip-hash";
import { network } from "../src/enrichers/network";
import { userAgent } from "../src/enrichers/user-agent";
import { utm } from "../src/enrichers/utm";
import { emptyLocation } from "../src/utilities/edge-geo";
import { batchContext, browserEvents, memoryPorts, settings } from "./batch";

const london = {
  geo: { ...emptyLocation, country: "GB", city: "London", timezone: "Europe/London" },
  network: { asn: 16509, asOrg: "AMAZON-02" },
};
const context: StageContext = {
  ports: { ...memoryPorts(), geo: memoryGeo(new Map([["81.2.69.160", london]])) },
  registry: { stages: [], signals: [], enrichers: [], dimensions: [] },
  settings,
};

function draft(headers: { [name: string]: string } = {}, trusted = false): EventDraft {
  const batch = batchContext();
  const [event] = browserEvents();
  if (!event) throw new Error("browser-batch fixture has no events");
  const merged = new Headers({ "x-forwarded-for": "81.2.69.160", ...headers });
  return createDraft(
    { ...batch, trusted, request: { ...batch.request, headers: merged } },
    event,
    0,
  );
}

describe("forwardedProxy", () => {
  test.each([
    ["untrusted keeps the request IP", false, { "x-visitor-ip": "2.2.2.2" }, "81.2.69.160"],
    ["trusted takes the forwarded header", true, { "x-visitor-ip": "2.2.2.2" }, "2.2.2.2"],
    ["trusted without a forwarded IP keeps the request IP", true, {}, "81.2.69.160"],
  ])("%s", async (_, trusted, headers, expected) => {
    const enriched = await forwardedProxy.enrich(draft(headers, trusted), context);
    expect(enriched.client?.ip ?? draft(headers, trusted).enrichment.client.ip).toBe(expected);
  });

  test("trusted prefers the event context over headers", async () => {
    const base = draft({ "x-visitor-ip": "2.2.2.2", "x-visitor-ua": "Forwarded" }, true);
    const withContext = {
      ...base,
      event: { ...base.event, context: { ip: "3.3.3.3", ua: "Server SDK" } },
    };
    const enriched = await forwardedProxy.enrich(withContext, context);
    expect(enriched.client).toMatchObject({ ip: "3.3.3.3", userAgent: "Server SDK" });
  });
});

describe("ipHash", () => {
  test.each([
    ["an address", {}, /^sha256\(81\.2\.69\.160sha256\(/],
    ["no address", { "x-forwarded-for": "" }, null],
  ])("%s", async (_, headers, expected) => {
    const enriched = await ipHash.enrich(draft(headers), context);
    if (expected) expect(enriched.client?.ipHash).toMatch(expected);
    else expect(enriched.client?.ipHash).toBeNull();
  });
});

describe("geo", () => {
  test.each([
    [
      "the city database wins when it finds a city, edge headers fill gaps",
      { "x-vercel-ip-country": "GB", "x-vercel-ip-city": "Hub", "x-vercel-ip-postal-code": "EC1" },
      { country: "GB", city: "London", postalCode: "EC1", timezone: "Europe/London" },
    ],
    [
      "edge headers win when the database has no city",
      { "x-forwarded-for": "10.0.0.1", "x-vercel-ip-country": "NL", "x-vercel-ip-city": "Utrecht" },
      { country: "NL", city: "Utrecht", timezone: "Europe/Amsterdam" },
    ],
    [
      "the browser timezone is the last fallback",
      { "x-forwarded-for": "10.0.0.1" },
      { country: "NL", city: null, timezone: "Europe/Amsterdam" },
    ],
  ])("%s", async (_, headers, expected) => {
    const enriched = await geo.enrich(draft(headers), context);
    expect(enriched.geo).toMatchObject(expected);
  });
});

describe("network", () => {
  test.each([
    ["a known address", {}, { asn: 16509, asOrg: "AMAZON-02" }],
    ["no address", { "x-forwarded-for": "" }, { asn: null, asOrg: null }],
  ])("%s", async (_, headers, expected) => {
    expect((await network.enrich(draft(headers), context)).network).toEqual(expected);
  });
});

describe("userAgent", () => {
  test.each([
    [
      "Chrome on macOS",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
      { type: "desktop", browser: "Chrome", os: "macOS" },
    ],
    [
      "Safari on iPhone",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
      { type: "mobile", browser: "Mobile Safari", os: "iOS" },
    ],
    ["no user agent", "", { type: "unknown", browser: null, os: null }],
  ])("%s", async (_, ua, expected) => {
    const enriched = await userAgent.enrich(draft({ "user-agent": ua }), context);
    expect(enriched.device).toMatchObject({ ...expected, screen: "1440x900", language: "nl-NL" });
  });
});

describe("utm", () => {
  test("reads the referrer and UTM tags into a source", async () => {
    expect((await utm.enrich(draft(), context)).source).toEqual({
      referrer: "https://news.ycombinator.com/",
      referrerDomain: "news.ycombinator.com",
      channel: "social",
      utm: { source: "hn", medium: null, campaign: null, term: null, content: null },
    });
  });
});
