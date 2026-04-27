export type BotDetectionResult = {
	isBot: boolean;
	reason: string | null;
	confidence: "high" | "medium" | "low";
};

type HeaderBag = {
	get(name: string): string | null;
};

type ReqData = {
	headers?: HeaderBag | null;
	method?: string | null;
};

function emptyHeaders(): HeaderBag {
	return {
		get() {
			return null;
		},
	};
}

function getHeaders(req: ReqData | null | undefined): HeaderBag {
	const headers = req?.headers;
	if (!headers) return emptyHeaders();
	return headers;
}

function getMethod(req: ReqData | null | undefined): string {
	return req?.method?.toUpperCase() ?? "GET";
}

const BOT_PATTERNS = [
	/bot/i,
	/crawler/i,
	/spider/i,
	/scraper/i,

	/googlebot/i,
	/bingbot/i,
	/slurp/i,
	/duckduckbot/i,
	/baiduspider/i,
	/yandexbot/i,
	/sogou/i,
	/exabot/i,

	/facebookexternalhit/i,
	/facebookcatalog/i,
	/twitterbot/i,
	/linkedinbot/i,
	/whatsapp/i,
	/telegrambot/i,
	/slackbot/i,
	/discordbot/i,

	/pingdom/i,
	/uptimerobot/i,
	/statuscake/i,
	/monitor/i,
	/newrelic/i,
	/datadog/i,

	/headless/i,
	/phantom/i,
	/selenium/i,
	/webdriver/i,
	/puppeteer/i,
	/playwright/i,
	/chrome-lighthouse/i,

	/scanner/i,
	/nikto/i,
	/nmap/i,
	/masscan/i,
	/nessus/i,
	/acunetix/i,
	/qualys/i,

	/curl/i,
	/wget/i,
	/python-requests/i,
	/python-urllib/i,
	/java\//i,
	/go-http-client/i,
	/okhttp/i,
	/apache-httpclient/i,

	/gptbot/i,
	/chatgpt/i,
	/claude-web/i,
	/anthropic-ai/i,
	/cohere-ai/i,
	/perplexitybot/i,
	/ai2bot/i,
	/bytespider/i,
	/claudebot/i,

	/ahrefsbot/i,
	/semrushbot/i,
	/mj12bot/i,
	/dotbot/i,
	/rogerbot/i,
	/screaming frog/i,

	/feedfetcher/i,
	/feedparser/i,
	/rss/i,
	/aggregator/i,
	/newspaper/i,

	/archive\.org_bot/i,
	/ia_archiver/i,
	/wayback/i,
];

export function isBotUserAgent(ua: string | null): boolean {
	if (!ua) return false;

	return BOT_PATTERNS.some(function (pattern) {
		return pattern.test(ua);
	});
}

function isBotByVercelHeader(headers: HeaderBag): boolean {
	const isBot = headers.get("x-vercel-bot");
	return isBot === "1" || isBot === "true";
}

function hasValidBrowserHeaders(headers: HeaderBag): boolean {
	const ua = headers.get("user-agent");
	const accept = headers.get("accept");
	const acceptLanguage = headers.get("accept-language");

	if (!ua || !accept) return false;
	if (!accept.includes("text/html")) return false;
	if (!acceptLanguage) return false;

	return true;
}

function isNavigationRequest(headers: HeaderBag, method: string): boolean {
	if (method !== "GET" && method !== "HEAD") return false;

	const secFetchMode = headers.get("sec-fetch-mode");
	const secFetchDest = headers.get("sec-fetch-dest");
	const accept = headers.get("accept");

	if (secFetchMode === "navigate") return true;
	if (secFetchDest === "document") return true;

	return accept?.includes("text/html") ?? false;
}

function hasBraveBrowser(ua: string | null): boolean {
	if (!ua) return false;
	return /brave/i.test(ua);
}

function hasPrivacyBrowser(ua: string | null): boolean {
	if (!ua) return false;
	return /brave\/|firefox\/|librewolf/i.test(ua);
}

export function detectBot(req: ReqData | null | undefined): BotDetectionResult {
	const headers = getHeaders(req);
	const method = getMethod(req);
	const ua = headers.get("user-agent");

	if (isBotByVercelHeader(headers)) {
		return { isBot: true, reason: "vercel-bot-header", confidence: "high" };
	}

	if (isBotUserAgent(ua)) {
		return { isBot: true, reason: "bot-user-agent", confidence: "high" };
	}

	// Privacy browsers should never be flagged as bots
	if (hasPrivacyBrowser(ua)) {
		return { isBot: false, reason: null, confidence: "low" };
	}

	if (isNavigationRequest(headers, method) && !hasValidBrowserHeaders(headers)) {
		return { isBot: true, reason: "invalid-headers", confidence: "medium" };
	}

	return { isBot: false, reason: null, confidence: "low" };
}

export function classifyDevice(ua: string | null, isBot: boolean = false): string {
	if (!ua) return "unknown";
	if (isBot) return "bot";

	const lower = ua.toLowerCase();

	if (lower.includes("ipad") || lower.includes("tablet")) return "tablet";
	if (lower.includes("android") && !lower.includes("mobile")) return "tablet";

	if (
		lower.includes("mobile") ||
		lower.includes("android") ||
		lower.includes("iphone") ||
		lower.includes("ipod") ||
		lower.includes("blackberry") ||
		lower.includes("windows phone")
	) {
		return "mobile";
	}

	if (
		lower.includes("windows") ||
		lower.includes("macintosh") ||
		lower.includes("linux") ||
		lower.includes("x11")
	) {
		return "desktop";
	}

	return "unknown";
}
