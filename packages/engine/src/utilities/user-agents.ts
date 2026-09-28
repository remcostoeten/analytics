import type { Nullable } from "@remcostoeten/analytics-shared/semantic";

const crawlers = [
  "Googlebot",
  "Google-InspectionTool",
  "GoogleOther",
  "Google-Extended",
  "Storebot-Google",
  "AdsBot-Google",
  "Mediapartners-Google",
  "APIs-Google",
  "Feedfetcher-Google",
  "bingbot",
  "BingPreview",
  "msnbot",
  "Slurp",
  "DuckDuckBot",
  "Baiduspider",
  "YandexBot",
  "YandexImages",
  "Sogou",
  "Exabot",
  "Applebot",
  "PetalBot",
  "SeznamBot",
  "Qwantify",
  "facebookexternalhit",
  "facebookcatalog",
  "meta-externalagent",
  "Twitterbot",
  "LinkedInBot",
  "WhatsApp",
  "TelegramBot",
  "Slackbot",
  "Discordbot",
  "Pinterestbot",
  "redditbot",
  "Embedly",
  "Iframely",
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "Claude-Web",
  "Claude-User",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "cohere-ai",
  "Bytespider",
  "CCBot",
  "Amazonbot",
  "Diffbot",
  "AhrefsBot",
  "SemrushBot",
  "MJ12bot",
  "DotBot",
  "rogerbot",
  "Screaming Frog",
  "DataForSeoBot",
  "BLEXBot",
  "SerpstatBot",
  "UptimeRobot",
  "Pingdom",
  "StatusCake",
  "Site24x7",
  "Better Uptime Bot",
  "Chrome-Lighthouse",
  "archive.org_bot",
  "ia_archiver",
  "Feedly",
  "Inoreader",
  "NewsBlur",
];

const automation = [
  "HeadlessChrome",
  "PhantomJS",
  "Puppeteer",
  "Playwright",
  "Selenium",
  "WebDriver",
  "Cypress",
  "curl/",
  "Wget/",
  "python-requests",
  "python-urllib",
  "aiohttp",
  "python-httpx",
  "Go-http-client",
  "okhttp",
  "Java/",
  "Apache-HttpClient",
  "node-fetch",
  "axios/",
  "undici",
  "libwww-perl",
  "Scrapy",
  "HTTPie",
  "Nikto",
  "Nmap",
  "masscan",
  "sqlmap",
  "zgrab",
];

function escaped(name: string) {
  return name.replaceAll(/[.*+?^${}()|[\]\\/]/g, "\\$&");
}

// One case-insensitive alternation of the escaped names.
function anyOf(names: string[]) {
  return new RegExp(names.map(escaped).join("|"), "i");
}

const crawlerPattern = anyOf(crawlers);
const automationPattern = anyOf(automation);

/**
 * @name isCrawler
 * @description Whether a user agent names a known crawler, preview fetcher, AI agent, SEO tool or
 * uptime monitor. The list is named on purpose: broad words such as `bot` or `rss` also match
 * real browsers and apps.
 *
 * @example
 * isCrawler("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"); // true
 */
export function isCrawler(userAgent: Nullable<string>): boolean {
  return userAgent ? crawlerPattern.test(userAgent) : false;
}

/**
 * @name isAutomation
 * @description Whether a user agent names an HTTP library, headless browser, test driver or
 * scanner.
 *
 * @example
 * isAutomation("curl/8.5.0"); // true
 */
export function isAutomation(userAgent: Nullable<string>): boolean {
  return userAgent ? automationPattern.test(userAgent) : false;
}

function major(userAgent: string, pattern: RegExp) {
  const match = pattern.exec(userAgent);
  return match?.[1] ? Number.parseInt(match[1], 10) : 0;
}

/**
 * @name isModernChromium
 * @description Whether a user agent is Chromium 90 or later, which sends `sec-ch-ua` on every
 * request over HTTPS. Chrome on iOS is WebKit and reports `CriOS`, so it does not count.
 *
 * @example
 * isModernChromium("Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36"); // true
 */
export function isModernChromium(userAgent: string): boolean {
  return major(userAgent, /Chrome\/(\d+)/) >= 90;
}

/**
 * @name isModernBrowser
 * @description Whether a user agent is a browser that sends `sec-fetch-*` headers: Chromium 90,
 * Firefox 90 or Safari 17 and later.
 *
 * @example
 * isModernBrowser("Mozilla/5.0 (X11; Linux x86_64; rv:143.0) Gecko/20100101 Firefox/143.0"); // true
 */
export function isModernBrowser(userAgent: string): boolean {
  return (
    isModernChromium(userAgent) ||
    major(userAgent, /Firefox\/(\d+)/) >= 90 ||
    (userAgent.includes("Safari/") && major(userAgent, /Version\/(\d+)/) >= 17)
  );
}
