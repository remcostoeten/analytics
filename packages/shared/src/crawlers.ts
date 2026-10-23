const aiCrawlers = [
  "meta-externalagent",
  "meta-externalfetcher",
  "facebookbot",
  "gptbot",
  "chatgpt-user",
  "oai-searchbot",
  "claudebot",
  "claude-web",
  "anthropic-ai",
  "ccbot",
  "bytespider",
  "amazonbot",
  "perplexitybot",
  "applebot-extended",
  "cohere-ai",
  "diffbot",
  "omgili",
  "youbot",
  "ai2bot",
  "petalbot",
  "timpibot",
  "imagesiftbot",
  "duckassistbot",
  "mistralai-user",
];

/**
 * @name isAiCrawler
 * @description Whether a user agent names one of the crawlers that gather training or answer
 * data for AI products. They tend to ignore robots.txt and nofollow, and one of them walked every
 * filter combination of the public dashboard pages, so the dashboard refuses them outright.
 *
 * @example
 * if (isAiCrawler(request.headers.get("user-agent"))) return new Response(null, { status: 403 });
 */
export function isAiCrawler(userAgent: string | null): boolean {
  if (!userAgent) return false;
  const agent = userAgent.toLowerCase();
  return aiCrawlers.some((name) => agent.includes(name));
}
