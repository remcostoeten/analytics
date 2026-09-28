import { describe, expect, test } from "bun:test";

import { channelOf, referrerDomain } from "../src/utilities/channel";

describe("referrerDomain", () => {
  test.each([
    ["https://www.google.com/search?q=x", "google.com"],
    ["https://news.ycombinator.com/item?id=1", "news.ycombinator.com"],
    ["not a url", null],
    [null, null],
  ])("%s", (referrer, expected) => {
    expect(referrerDomain(referrer)).toBe(expected);
  });
});

describe("channelOf", () => {
  const site = "remcostoeten.nl";
  test.each([
    ["no referrer", null, null, "direct"],
    ["paid medium wins", "google.com", "cpc", "paid"],
    ["facebook ads", "facebook.com", "facebook_ads", "paid"],
    ["email medium", null, "email", "email"],
    ["social medium", null, "social", "social"],
    ["own site", "remcostoeten.nl", null, "internal"],
    ["search engine", "google.nl", null, "search"],
    ["duckduckgo", "duckduckgo.com", null, "search"],
    ["social network", "news.ycombinator.com", null, "social"],
    ["subdomain of a social network", "old.reddit.com", null, "social"],
    ["lookalike is not social", "notx.com", null, "referral"],
    ["other site", "dev.to", null, "referral"],
  ])("%s", (_, referrerDomain, medium, expected) => {
    expect<string>(channelOf({ referrerDomain, siteHost: site, medium })).toBe(expected);
  });
});
