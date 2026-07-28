const DAYS = 90;
const PROJECT_ID = "default";
const DAY_MS = 86_400_000;

type City = {
	country: string;
	region: string;
	city: string;
	lat: number;
	lon: number;
	timezone: string;
	weight: number;
};

const CITIES: City[] = [
	{ country: "NL", region: "GR", city: "Groningen", lat: 53.219, lon: 6.566, timezone: "Europe/Amsterdam", weight: 14 },
	{ country: "NL", region: "ZH", city: "Rotterdam", lat: 51.924, lon: 4.478, timezone: "Europe/Amsterdam", weight: 9 },
	{ country: "NL", region: "UT", city: "Utrecht", lat: 52.091, lon: 5.122, timezone: "Europe/Amsterdam", weight: 8 },
	{ country: "NL", region: "NB", city: "Eindhoven", lat: 51.441, lon: 5.469, timezone: "Europe/Amsterdam", weight: 7 },
	{ country: "NL", region: "NH", city: "Amsterdam", lat: 52.373, lon: 4.892, timezone: "Europe/Amsterdam", weight: 7 },
	{ country: "NL", region: "OV", city: "Zwolle", lat: 52.516, lon: 6.083, timezone: "Europe/Amsterdam", weight: 5 },
	{ country: "NL", region: "GE", city: "Nijmegen", lat: 51.842, lon: 5.852, timezone: "Europe/Amsterdam", weight: 5 },
	{ country: "NL", region: "FR", city: "Leeuwarden", lat: 53.201, lon: 5.799, timezone: "Europe/Amsterdam", weight: 4 },
	{ country: "NL", region: "ZH", city: "The Hague", lat: 52.07, lon: 4.3, timezone: "Europe/Amsterdam", weight: 4 },
	{ country: "NL", region: "LI", city: "Maastricht", lat: 50.851, lon: 5.691, timezone: "Europe/Amsterdam", weight: 3 },
	{ country: "DE", region: "BE", city: "Berlin", lat: 52.52, lon: 13.405, timezone: "Europe/Berlin", weight: 6 },
	{ country: "DE", region: "BY", city: "Munich", lat: 48.135, lon: 11.582, timezone: "Europe/Berlin", weight: 3 },
	{ country: "BE", region: "VAN", city: "Antwerp", lat: 51.219, lon: 4.402, timezone: "Europe/Brussels", weight: 4 },
	{ country: "GB", region: "ENG", city: "London", lat: 51.507, lon: -0.128, timezone: "Europe/London", weight: 6 },
	{ country: "US", region: "NY", city: "New York", lat: 40.713, lon: -74.006, timezone: "America/New_York", weight: 5 },
	{ country: "US", region: "CA", city: "San Francisco", lat: 37.775, lon: -122.419, timezone: "America/Los_Angeles", weight: 4 },
	{ country: "FR", region: "IDF", city: "Paris", lat: 48.857, lon: 2.352, timezone: "Europe/Paris", weight: 3 },
	{ country: "SE", region: "AB", city: "Stockholm", lat: 59.329, lon: 18.069, timezone: "Europe/Stockholm", weight: 2 },
	{ country: "IN", region: "KA", city: "Bengaluru", lat: 12.972, lon: 77.594, timezone: "Asia/Kolkata", weight: 2 },
	{ country: "BR", region: "SP", city: "Sao Paulo", lat: -23.551, lon: -46.633, timezone: "America/Sao_Paulo", weight: 2 },
];

const BROWSERS = [
	{ name: "Chrome", weight: 55 },
	{ name: "Safari", weight: 18 },
	{ name: "Firefox", weight: 14 },
	{ name: "Edge", weight: 9 },
	{ name: "Opera", weight: 4 },
];

const OSES = [
	{ name: "Windows", weight: 34, devices: ["desktop"] },
	{ name: "macOS", weight: 26, devices: ["desktop"] },
	{ name: "Linux", weight: 10, devices: ["desktop"] },
	{ name: "iOS", weight: 14, devices: ["mobile", "tablet"] },
	{ name: "Android", weight: 16, devices: ["mobile", "tablet"] },
];

const SCREENS_DESKTOP = ["1920x1080", "2560x1440", "1440x900", "1366x768", "3440x1440"];
const SCREENS_MOBILE = ["390x844", "412x915", "375x812", "360x800"];
const LANGS = ["nl-NL", "nl-NL", "en-US", "en-GB", "de-DE", "fr-FR", "sv-SE", "pt-BR"];
const CONNECTIONS = ["4g", "4g", "4g", "wifi", "wifi", "wifi", "wifi", "3g"];

const PATHS = [
	{ path: "/", weight: 30 },
	{ path: "/blog", weight: 12 },
	{ path: "/blog/building-privacy-first-analytics", weight: 9 },
	{ path: "/blog/geolite2-city-accuracy", weight: 7 },
	{ path: "/blog/self-hosting-on-vercel", weight: 6 },
	{ path: "/pricing", weight: 8 },
	{ path: "/docs", weight: 7 },
	{ path: "/docs/getting-started", weight: 6 },
	{ path: "/docs/sdk-reference", weight: 5 },
	{ path: "/features", weight: 4 },
	{ path: "/about", weight: 3 },
	{ path: "/contact", weight: 2 },
	{ path: "/signup", weight: 2 },
];

const REFERRERS = [
	{ ref: null, weight: 40 },
	{ ref: "https://www.google.com/", weight: 24 },
	{ ref: "https://github.com/remcostoeten", weight: 10 },
	{ ref: "https://news.ycombinator.com/", weight: 7 },
	{ ref: "https://www.reddit.com/r/selfhosted/", weight: 6 },
	{ ref: "https://t.co/x8fj2k", weight: 5 },
	{ ref: "https://dev.to/", weight: 4 },
	{ ref: "https://www.linkedin.com/", weight: 4 },
];

const UTM_CAMPAIGNS = [
	{ source: "newsletter", medium: "email", campaign: "march-launch" },
	{ source: "twitter", medium: "social", campaign: "geo-release" },
	{ source: "producthunt", medium: "referral", campaign: "ph-launch" },
];

const ERROR_MESSAGES = [
	"TypeError: Cannot read properties of undefined (reading 'map')",
	"ChunkLoadError: Loading chunk 42 failed",
	"NetworkError when attempting to fetch resource",
	"ReferenceError: gtag is not defined",
];

const BOT_UAS = [
	"Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
	"Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
	"Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)",
];

let seedState = 42;

function random(): number {
	seedState = (seedState * 1103515245 + 12345) & 0x7fffffff;
	return seedState / 0x7fffffff;
}

function pickWeighted<T extends { weight: number }>(items: T[]): T {
	const total = items.reduce((sum, item) => sum + item.weight, 0);
	let roll = random() * total;
	for (const item of items) {
		roll -= item.weight;
		if (roll <= 0) return item;
	}
	return items[items.length - 1];
}

function pick<T>(items: T[]): T {
	return items[Math.floor(random() * items.length)];
}

function randomInt(min: number, max: number): number {
	return min + Math.floor(random() * (max - min + 1));
}

function jitterCoord(value: number): number {
	return Math.round((value + (random() - 0.5) * 0.1) * 1000) / 1000;
}

type Visitor = {
	visitorId: string;
	fingerprint: string;
	city: City;
	browser: string;
	os: string;
	deviceType: string;
	screen: string;
	lang: string;
	connection: string;
	ua: string;
	ipHash: string;
	firstSeen: Date;
	lastSeen: Date;
	visitCount: number;
};

function makeVisitor(index: number, firstSeen: Date): Visitor {
	const city = pickWeighted(CITIES);
	const os = pickWeighted(OSES);
	const deviceType = pick(os.devices) === "desktop" ? "desktop" : random() < 0.85 ? "mobile" : "tablet";
	const browser = os.name === "iOS" ? "Safari" : pickWeighted(BROWSERS).name;
	return {
		visitorId: `vis_demo_${index.toString(36)}`,
		fingerprint: `fp_demo_${index.toString(36)}`,
		city,
		browser,
		os: os.name,
		deviceType,
		screen: deviceType === "desktop" ? pick(SCREENS_DESKTOP) : pick(SCREENS_MOBILE),
		lang: city.country === "NL" ? "nl-NL" : pick(LANGS),
		connection: pick(CONNECTIONS),
		ua: `Mozilla/5.0 (demo) Browser/${browser}`,
		ipHash: `iphash_demo_${index.toString(36)}`,
		firstSeen,
		lastSeen: firstSeen,
		visitCount: 0,
	};
}

type EventRow = Record<string, unknown>;
type SessionRow = Record<string, unknown>;

function baseEvent(visitor: Visitor, sessionId: string, ts: Date, path: string): EventRow {
	return {
		project_id: PROJECT_ID,
		type: "pageview",
		ts,
		path,
		referrer: null,
		origin: "https://demo.example.com",
		host: "demo.example.com",
		is_localhost: false,
		is_preview: false,
		bot_detected: false,
		is_internal: false,
		ua: visitor.ua,
		lang: visitor.lang,
		device_type: visitor.deviceType,
		ip_hash: visitor.ipHash,
		visitor_id: visitor.visitorId,
		session_id: sessionId,
		country: visitor.city.country,
		region: visitor.city.region,
		city: visitor.city.city,
		latitude: jitterCoord(visitor.city.lat),
		longitude: jitterCoord(visitor.city.lon),
		timezone: visitor.city.timezone,
		postal_code: null,
		continent: visitor.city.country === "US" || visitor.city.country === "BR" ? "NA" : "EU",
		asn: null,
		as_org: null,
		fingerprint: null,
		meta: null,
	};
}

function deviceMeta(visitor: Visitor): Record<string, unknown> {
	return {
		browser: visitor.browser,
		os: visitor.os,
		screenSize: visitor.screen,
		connectionType: visitor.connection,
	};
}

function buildSession(
	visitor: Visitor,
	sessionIndex: number,
	startedAt: Date,
): { events: EventRow[]; session: SessionRow } {
	const sessionId = `sess_demo_${sessionIndex.toString(36)}`;
	const referrer = pickWeighted(REFERRERS).ref;
	const utm = random() < 0.08 ? pick(UTM_CAMPAIGNS) : null;
	const pageCount = randomInt(1, 6);
	const events: EventRow[] = [];

	let ts = new Date(startedAt);
	let path = pickWeighted(PATHS).path;
	const entryPath = path;

	for (let i = 0; i < pageCount; i++) {
		const pageview = baseEvent(visitor, sessionId, ts, path);
		pageview.referrer = i === 0 ? referrer : null;
		pageview.meta = {
			...deviceMeta(visitor),
			...(utm && i === 0
				? { utmSource: utm.source, utmMedium: utm.medium, utmCampaign: utm.campaign }
				: {}),
		};
		events.push(pageview);

		const timeOnPageMs = randomInt(4_000, 240_000);
		let depth = 0;
		const scrollChunks = randomInt(1, 3);
		for (let c = 0; c < scrollChunks; c++) {
			depth = Math.min(100, depth + randomInt(20, 45));
			events.push({
				...baseEvent(visitor, sessionId, new Date(ts.getTime() + (c + 1) * 2_000), path),
				type: "event",
				meta: { ...deviceMeta(visitor), eventName: "scroll", depth },
			});
		}

		events.push({
			...baseEvent(visitor, sessionId, new Date(ts.getTime() + timeOnPageMs), path),
			type: "event",
			meta: { ...deviceMeta(visitor), eventName: "time-on-page", timeOnPageMs },
		});

		if (i === 0 && random() < 0.6) {
			events.push({
				...baseEvent(visitor, sessionId, new Date(ts.getTime() + 1_500), path),
				type: "event",
				meta: {
					...deviceMeta(visitor),
					eventName: "web-vitals",
					lcp: randomInt(900, 4_200),
					cls: Math.round(random() * 25) / 100,
					inp: randomInt(40, 500),
					fcp: randomInt(600, 2_800),
					ttfb: randomInt(80, 900),
				},
			});
		}

		if (random() < 0.02) {
			events.push({
				...baseEvent(visitor, sessionId, new Date(ts.getTime() + randomInt(2_000, 20_000)), path),
				type: "error",
				meta: { ...deviceMeta(visitor), eventName: "error", message: pick(ERROR_MESSAGES) },
			});
		}

		if (path === "/pricing" && random() < 0.15) {
			events.push({
				...baseEvent(visitor, sessionId, new Date(ts.getTime() + timeOnPageMs - 1_000), path),
				type: "event",
				meta: { ...deviceMeta(visitor), eventName: "signup-click" },
			});
		}

		ts = new Date(ts.getTime() + timeOnPageMs + randomInt(500, 3_000));
		path = pickWeighted(PATHS).path;
	}

	const exitPath = events[events.length - 1].path as string;
	const durationMs = ts.getTime() - startedAt.getTime();

	return {
		events,
		session: {
			project_id: PROJECT_ID,
			session_id: sessionId,
			visitor_id: visitor.visitorId,
			started_at: startedAt,
			last_event_at: ts,
			entry_path: entryPath,
			exit_path: exitPath,
			referrer,
			pageviews: pageCount,
			events: events.length,
			duration_ms: durationMs,
			country: visitor.city.country,
			device_type: visitor.deviceType,
			is_internal: false,
		},
	};
}

function buildBotEvents(day: Date, count: number): EventRow[] {
	const rows: EventRow[] = [];
	for (let i = 0; i < count; i++) {
		const city = pickWeighted(CITIES);
		const ts = new Date(day.getTime() + randomInt(0, DAY_MS - 1));
		rows.push({
			project_id: PROJECT_ID,
			type: "pageview",
			ts,
			path: pickWeighted(PATHS).path,
			referrer: null,
			origin: "https://demo.example.com",
			host: "demo.example.com",
			is_localhost: false,
			is_preview: false,
			bot_detected: true,
			is_internal: false,
			ua: pick(BOT_UAS),
			lang: null,
			device_type: "desktop",
			ip_hash: `iphash_bot_${randomInt(1, 40)}`,
			visitor_id: null,
			session_id: null,
			country: city.country,
			region: city.region,
			city: city.city,
			latitude: city.lat,
			longitude: city.lon,
			timezone: city.timezone,
			postal_code: null,
			continent: "EU",
			asn: 16509,
			as_org: "AMAZON-02",
			fingerprint: null,
			meta: { botDetected: "true", botReason: "known-bot-ua" },
		});
	}
	return rows;
}

function dailySessionTarget(dayIndex: number): number {
	const date = new Date(Date.now() - (DAYS - dayIndex) * DAY_MS);
	const weekday = date.getUTCDay();
	const weekendFactor = weekday === 0 || weekday === 6 ? 0.55 : 1;
	const growth = 1 + (dayIndex / DAYS) * 0.8;
	const noise = 0.75 + random() * 0.5;
	return Math.round(28 * weekendFactor * growth * noise);
}

function sqlLiteral(value: unknown): string {
	if (value === null || value === undefined) return "NULL";
	if (typeof value === "number") return String(value);
	if (typeof value === "boolean") return value ? "true" : "false";
	if (value instanceof Date) return `'${value.toISOString()}'`;
	if (typeof value === "object") {
		return `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;
	}
	return `'${String(value).replaceAll("'", "''")}'`;
}

function emitInserts(table: string, rows: Record<string, unknown>[]): void {
	const columns = Object.keys(rows[0]);
	for (let i = 0; i < rows.length; i += 500) {
		const values = rows
			.slice(i, i + 500)
			.map((row) => `(${columns.map((c) => sqlLiteral(row[c])).join(",")})`)
			.join(",\n");
		process.stdout.write(`INSERT INTO ${table} (${columns.join(",")}) VALUES\n${values};\n`);
	}
}

function main() {
	const visitors: Visitor[] = [];
	const allEvents: EventRow[] = [];
	const allSessions: SessionRow[] = [];
	let sessionCounter = 0;

	const start = new Date(Date.now() - DAYS * DAY_MS);
	for (let day = 0; day < DAYS; day++) {
		const dayStart = new Date(start.getTime() + day * DAY_MS);
		const target = dailySessionTarget(day);

		for (let s = 0; s < target; s++) {
			const returning = visitors.length > 50 && random() < 0.35;
			const startedAt = new Date(dayStart.getTime() + randomInt(6, 23) * 3_600_000 + randomInt(0, 3_599_000));
			let visitor: Visitor;
			if (returning) {
				visitor = pick(visitors);
			} else {
				visitor = makeVisitor(visitors.length, startedAt);
				visitors.push(visitor);
			}
			visitor.visitCount += 1;
			if (startedAt > visitor.lastSeen) visitor.lastSeen = startedAt;

			const { events, session } = buildSession(visitor, sessionCounter++, startedAt);
			allEvents.push(...events);
			allSessions.push(session);
		}

		allEvents.push(...buildBotEvents(dayStart, randomInt(2, 9)));
	}

	console.error(
		`Generating ${allEvents.length} events, ${allSessions.length} sessions, ${visitors.length} visitors over ${DAYS} days...`,
	);

	process.stdout.write("BEGIN;\n");
	process.stdout.write("TRUNCATE events, sessions, visitors, rollup_daily RESTART IDENTITY;\n");
	emitInserts("events", allEvents);
	emitInserts("sessions", allSessions);

	const visitorRows = visitors.map((v) => ({
		project_id: PROJECT_ID,
		fingerprint: v.fingerprint,
		first_seen: v.firstSeen,
		last_seen: v.lastSeen,
		visit_count: Math.max(1, v.visitCount),
		is_internal: false,
		device_type: v.deviceType,
		os: v.os,
		browser: v.browser,
		screen_resolution: v.screen,
		timezone: v.city.timezone,
		language: v.lang,
		country: v.city.country,
		region: v.city.region,
		city: v.city.city,
		ip_hash: v.ipHash,
		ua: v.ua,
	}));
	emitInserts("visitors", visitorRows);
	process.stdout.write("COMMIT;\n");
}

main();
