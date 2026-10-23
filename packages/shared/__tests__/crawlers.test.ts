import { describe, expect, test } from "bun:test";

import { isAiCrawler } from "../src/crawlers";

describe("isAiCrawler", () => {
  test("names the AI crawlers by their user agent token", () => {
    expect(
      isAiCrawler(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (compatible; meta-externalagent/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler))",
      ),
    ).toBe(true);
    expect(
      isAiCrawler(
        "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.2; +https://openai.com/gptbot",
      ),
    ).toBe(true);
    expect(isAiCrawler("Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)")).toBe(
      true,
    );
  });

  test("lets browsers, search engines and a missing header through", () => {
    expect(
      isAiCrawler(
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/152.0.0.0 Safari/537.36",
      ),
    ).toBe(false);
    expect(
      isAiCrawler("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"),
    ).toBe(false);
    expect(isAiCrawler(null)).toBe(false);
  });
});
