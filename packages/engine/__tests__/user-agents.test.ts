import { describe, expect, test } from "bun:test";

import { hostingProvider } from "../src/utilities/hosting-asns";
import {
  isAutomation,
  isCrawler,
  isModernBrowser,
  isModernChromium,
} from "../src/utilities/user-agents";
import { agents } from "./requests";

describe("isCrawler", () => {
  test.each([
    ["Googlebot", agents.googlebot, true],
    ["GPTBot", agents.gptbot, true],
    ["Slack previews", "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)", true],
    ["Ahrefs", "Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)", true],
    ["Chrome", agents.chrome, false],
    [
      "an app with bot in its name is not matched by a broad pattern",
      "RobotVacuumApp/1.0 CFNetwork",
      false,
    ],
    [
      "an RSS-reading browser extension is not a crawler",
      `${agents.firefox} rss-helper/1.0`,
      false,
    ],
    ["no user agent", null, false],
  ])("%s", (_, userAgent, expected) => {
    expect(isCrawler(userAgent)).toBe(expected);
  });
});

describe("isAutomation", () => {
  test.each([
    ["curl", agents.curl, true],
    ["python-requests", agents.requests, true],
    ["HeadlessChrome", agents.headless, true],
    ["Go", "Go-http-client/2.0", true],
    ["Chrome", agents.chrome, false],
    ["Firefox", agents.firefox, false],
    ["no user agent", null, false],
  ])("%s", (_, userAgent, expected) => {
    expect(isAutomation(userAgent)).toBe(expected);
  });
});

describe("isModernChromium and isModernBrowser", () => {
  test.each([
    ["Chrome 140", agents.chrome, true, true],
    ["Chrome 80", agents.chrome.replace("140.0.0.0", "80.0.0.0"), false, false],
    ["Chrome on iOS is WebKit", agents.chromeIos, false, false],
    ["Firefox 143", agents.firefox, false, true],
    ["Safari 18", agents.safari, false, true],
    ["Safari 15", agents.safari.replace("Version/18.6", "Version/15.6"), false, false],
    ["curl", agents.curl, false, false],
  ])("%s", (_, userAgent, chromium, modern) => {
    expect([isModernChromium(userAgent), isModernBrowser(userAgent)]).toEqual([chromium, modern]);
  });
});

describe("hostingProvider", () => {
  test.each([
    [16509, "Amazon AWS"],
    [24940, "Hetzner"],
    [14061, "DigitalOcean"],
    [1136, null],
    [null, null],
  ])("%s", (asn, expected) => {
    expect(hostingProvider(asn)).toBe(expected);
  });
});
