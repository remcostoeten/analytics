import { describe, expect, test } from "bun:test";

import type { Signal } from "../src/define";
import { createDraft } from "../src/draft";
import type { EventDraft } from "../src/draft";
import { asnDatacenter } from "../src/signals/asn-datacenter";
import { clientHeadless } from "../src/signals/client-headless";
import { clientNoInput } from "../src/signals/client-no-input";
import { clientWebdriver } from "../src/signals/client-webdriver";
import { edgeVerifiedBot } from "../src/signals/edge-verified-bot";
import { headersInconsistent } from "../src/signals/headers-inconsistent";
import { headersMissing } from "../src/signals/headers-missing";
import { ipFanout } from "../src/signals/ip-fanout";
import { sessionVelocity } from "../src/signals/session-velocity";
import { uaAutomation } from "../src/signals/ua-automation";
import { uaCrawler } from "../src/signals/ua-crawler";
import { scoreBot } from "../src/stages/bot-score";
import { batchContext, browserEvents } from "./batch";
import { agents, browserHeaders } from "./requests";

type Options = {
  headers?: { [name: string]: string };
  signals?: number;
  asn?: number;
  trusted?: boolean;
  replay?: boolean;
  reasons?: EventDraft["bot"]["reasons"];
};

function draft(options: Options = {}): EventDraft {
  const batch = batchContext();
  const [event] = browserEvents();
  if (!event) throw new Error("browser-batch fixture has no events");
  const headers = new Headers(options.headers ?? browserHeaders.chrome);
  const base = createDraft(
    { ...batch, trusted: options.trusted ?? false, request: { headers, adminSession: false } },
    { ...event, signals: options.signals ?? 0 },
    0,
  );
  return {
    ...base,
    enrichment: { ...base.enrichment, network: { asn: options.asn ?? null, asOrg: null } },
    bot: { score: 0, reasons: options.reasons ?? [] },
    replay: options.replay ?? false,
  };
}

function without(name: string, headers: { [name: string]: string }) {
  return Object.fromEntries(Object.entries(headers).filter(([key]) => key !== name));
}

function cases(signal: Signal, table: [string, Options, boolean][]) {
  describe(signal.name, () => {
    test.each(table)("%s", (_, options, expected) => {
      expect(signal.detect(draft(options))).toBe(expected);
    });
  });
}

cases(uaCrawler, [
  ["Googlebot", { headers: { "user-agent": agents.googlebot } }, true],
  ["GPTBot", { headers: { "user-agent": agents.gptbot } }, true],
  ["Chrome", {}, false],
]);

cases(uaAutomation, [
  ["curl", { headers: { "user-agent": agents.curl } }, true],
  ["HeadlessChrome", { headers: { "user-agent": agents.headless } }, true],
  ["no user agent from a browser key", { headers: {} }, true],
  ["no user agent from a secret key", { headers: {}, trusted: true }, false],
  ["no user agent on replay keeps no reason", { headers: {}, replay: true }, false],
  [
    "no user agent on replay keeps its reason",
    { headers: {}, replay: true, reasons: ["ua_automation"] },
    true,
  ],
  ["Chrome", {}, false],
]);

cases(edgeVerifiedBot, [
  ["x-vercel-bot", { headers: { ...browserHeaders.chrome, "x-vercel-bot": "1" } }, true],
  ["cf-verified-bot", { headers: { ...browserHeaders.chrome, "cf-verified-bot": "true" } }, true],
  ["x-vercel-bot false", { headers: { ...browserHeaders.chrome, "x-vercel-bot": "0" } }, false],
  ["no edge header", {}, false],
]);

cases(asnDatacenter, [
  ["AWS", { asn: 16509 }, true],
  ["Hetzner", { asn: 24940 }, true],
  ["a consumer ISP", { asn: 1136 }, false],
  ["unknown", {}, false],
]);

cases(headersInconsistent, [
  ["Chrome with client hints and fetch metadata", {}, false],
  ["Chrome without sec-ch-ua", { headers: without("sec-ch-ua", browserHeaders.chrome) }, true],
  [
    "Chrome without fetch metadata",
    { headers: without("sec-fetch-site", without("sec-fetch-mode", browserHeaders.chrome)) },
    true,
  ],
  ["Brave", { headers: browserHeaders.brave }, false],
  ["Firefox without sec-ch-ua", { headers: browserHeaders.firefox }, false],
  ["Firefox without fetch metadata", { headers: { "user-agent": agents.firefox } }, true],
  ["Safari", { headers: browserHeaders.safari }, false],
  [
    "Chrome on iOS without client hints",
    { headers: { ...browserHeaders.safari, "user-agent": agents.chromeIos } },
    false,
  ],
  [
    "curl has no browser to be inconsistent with",
    { headers: { "user-agent": agents.curl } },
    false,
  ],
  [
    "a secret-key request comes from a server",
    { headers: { "user-agent": agents.chrome }, trusted: true },
    false,
  ],
]);

cases(headersMissing, [
  ["accept-language present", {}, false],
  ["accept-language missing", { headers: without("accept-language", browserHeaders.chrome) }, true],
  ["a secret-key request", { headers: { "user-agent": agents.chrome }, trusted: true }, false],
]);

cases(clientWebdriver, [
  ["webdriver bit", { signals: 1 }, true],
  ["all bits", { signals: 7 }, true],
  ["other bits", { signals: 6 }, false],
  ["no bits", {}, false],
]);

cases(clientHeadless, [
  ["headless bit", { signals: 2 }, true],
  ["other bits", { signals: 5 }, false],
]);

cases(clientNoInput, [
  ["no-input bit", { signals: 4 }, true],
  ["other bits", { signals: 3 }, false],
]);

cases(sessionVelocity, [["never at ingest", { reasons: ["session_velocity"] }, false]]);

cases(ipFanout, [["never at ingest", { reasons: ["ip_fanout"] }, false]]);

describe("scoreBot", () => {
  const signals = [uaCrawler, asnDatacenter, headersMissing, clientWebdriver, sessionVelocity];

  test("sums the firing weights and caps at 100", () => {
    expect(
      scoreBot(signals, draft({ headers: { "user-agent": agents.googlebot }, asn: 16509 })),
    ).toEqual({
      score: 100,
      reasons: ["ua_crawler", "asn_datacenter", "headers_missing"],
    });
  });

  test("a replay reruns stored-input signals and keeps the other stored reasons", () => {
    const replayed = draft({
      headers: {},
      asn: 24940,
      replay: true,
      reasons: ["headers_missing", "session_velocity", "client_headless"],
    });
    expect(scoreBot(signals, replayed)).toEqual({
      score: 100,
      reasons: ["asn_datacenter", "headers_missing", "session_velocity"],
    });
  });
});
