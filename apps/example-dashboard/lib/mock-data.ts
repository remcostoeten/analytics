import type {
	DashboardData,
	SignalEvent,
	ContentMetric,
	ReferrerMetric,
	GeoDistribution,
	DeviceBreakdown,
	BotMetric,
	LiveSession,
} from "./types";

// =============================================================================
// MOCK DATA GENERATORS
// Replace these with actual database queries in production
// =============================================================================

function generateSparkline(length: number, base: number, variance: number): number[] {
	return Array.from({ length }, () => Math.max(0, base + (Math.random() - 0.5) * variance));
}

// KPI Cards
export const mockKPIs: DashboardData["kpis"] = {
	pageviews: {
		id: "pageviews",
		label: "Pageviews",
		value: 124892,
		formattedValue: "124.9K",
		trend: { value: 12.3, direction: "up", isPositive: true },
		sparkline: generateSparkline(12, 10000, 3000),
	},
	uniqueVisitors: {
		id: "unique-visitors",
		label: "Unique Visitors",
		value: 18432,
		formattedValue: "18.4K",
		trend: { value: 8.7, direction: "up", isPositive: true },
		sparkline: generateSparkline(12, 1500, 400),
	},
	sessions: {
		id: "sessions",
		label: "Sessions",
		value: 32156,
		formattedValue: "32.2K",
		trend: { value: 5.2, direction: "up", isPositive: true },
		sparkline: generateSparkline(12, 2600, 600),
	},
	events: {
		id: "events",
		label: "Events",
		value: 289431,
		formattedValue: "289.4K",
		trend: { value: 3.1, direction: "up", isPositive: true },
	},
	botRate: {
		id: "bot-rate",
		label: "Bot Rate",
		value: 4.2,
		formattedValue: "4.2%",
		unit: "%",
		trend: { value: 0.3, direction: "down", isPositive: true },
	},
	localhostRate: {
		id: "localhost-rate",
		label: "Localhost",
		value: 2.1,
		formattedValue: "2.1%",
		unit: "%",
		trend: { value: 0.1, direction: "flat", isPositive: true },
	},
	errorCount: {
		id: "error-count",
		label: "Errors",
		value: 127,
		formattedValue: "127",
		trend: { value: 12, direction: "down", isPositive: true },
	},
};

// Signals array - will be populated from real data sources
// No fake/simulated data - connect to your actual endpoints
export const mockSignals: SignalEvent[] = [];

// Top pages
export const mockTopPages: ContentMetric[] = [
	{ path: "/", views: 45123, uniqueVisitors: 12453, avgDuration: 32, bounceRate: 0.42 },
	{ path: "/pricing", views: 12847, uniqueVisitors: 8234, avgDuration: 89, bounceRate: 0.28 },
	{
		path: "/docs/getting-started",
		views: 8934,
		uniqueVisitors: 5621,
		avgDuration: 145,
		bounceRate: 0.18,
	},
	{
		path: "/blog/analytics-guide",
		views: 6721,
		uniqueVisitors: 4532,
		avgDuration: 234,
		bounceRate: 0.22,
	},
	{ path: "/features", views: 5432, uniqueVisitors: 3876, avgDuration: 56, bounceRate: 0.35 },
	{
		path: "/docs/api-reference",
		views: 4123,
		uniqueVisitors: 2987,
		avgDuration: 312,
		bounceRate: 0.12,
	},
	{ path: "/contact", views: 2341, uniqueVisitors: 1876, avgDuration: 45, bounceRate: 0.65 },
	{ path: "/about", views: 1923, uniqueVisitors: 1654, avgDuration: 67, bounceRate: 0.48 },
];

// Top referrers
export const mockReferrers: ReferrerMetric[] = [
	{ referrer: "https://google.com", domain: "google.com", visits: 23456, percentage: 38.2 },
	{ referrer: "https://twitter.com", domain: "twitter.com", visits: 8932, percentage: 14.5 },
	{ referrer: "(direct)", domain: "Direct", visits: 7845, percentage: 12.8 },
	{ referrer: "https://github.com", domain: "github.com", visits: 5643, percentage: 9.2 },
	{ referrer: "https://linkedin.com", domain: "linkedin.com", visits: 4521, percentage: 7.4 },
	{ referrer: "https://reddit.com", domain: "reddit.com", visits: 3254, percentage: 5.3 },
	{ referrer: "https://dev.to", domain: "dev.to", visits: 2341, percentage: 3.8 },
	{ referrer: "https://hn.algolia.com", domain: "Hacker News", visits: 1876, percentage: 3.1 },
];

// Geographic distribution
export const mockGeoCountry: GeoDistribution[] = [
	{ country: "United States", countryCode: "US", count: 45234, percentage: 36.8 },
	{ country: "Germany", countryCode: "DE", count: 12453, percentage: 10.1 },
	{ country: "United Kingdom", countryCode: "GB", count: 9876, percentage: 8.0 },
	{ country: "France", countryCode: "FR", count: 7654, percentage: 6.2 },
	{ country: "Canada", countryCode: "CA", count: 6543, percentage: 5.3 },
	{ country: "Netherlands", countryCode: "NL", count: 5432, percentage: 4.4 },
	{ country: "Australia", countryCode: "AU", count: 4321, percentage: 3.5 },
	{ country: "Japan", countryCode: "JP", count: 3456, percentage: 2.8 },
	{ country: "Brazil", countryCode: "BR", count: 2987, percentage: 2.4 },
	{ country: "India", countryCode: "IN", count: 2543, percentage: 2.1 },
];

// Device breakdown
export const mockDevices: DeviceBreakdown[] = [
	{ type: "Desktop", count: 78432, percentage: 63.8 },
	{ type: "Mobile", count: 38234, percentage: 31.1 },
	{ type: "Tablet", count: 6234, percentage: 5.1 },
];

// Bot metrics
export const mockBotMetrics: BotMetric[] = [
	{ reason: "Known Bot UA", count: 2341, percentage: 45.2, confidence: 0.99 },
	{ reason: "Behavior Pattern", count: 1234, percentage: 23.8, confidence: 0.87 },
	{ reason: "Rate Limit Hit", count: 876, percentage: 16.9, confidence: 0.95 },
	{ reason: "IP Reputation", count: 432, percentage: 8.3, confidence: 0.82 },
	{ reason: "Honeypot Trigger", count: 298, percentage: 5.8, confidence: 0.98 },
];

// Live sessions
export const mockLiveSessions: LiveSession[] = [
	{
		sessionId: "sess_8f3a2b",
		visitorId: "vis_12345",
		country: "US",
		city: "San Francisco",
		path: "/docs/getting-started",
		startedAt: new Date(Date.now() - 180000),
		lastActivity: new Date(Date.now() - 5000),
		pageviews: 4,
		isBot: false,
	},
	{
		sessionId: "sess_9c4d1e",
		visitorId: "vis_67890",
		country: "DE",
		city: "Berlin",
		path: "/pricing",
		startedAt: new Date(Date.now() - 120000),
		lastActivity: new Date(Date.now() - 12000),
		pageviews: 2,
		isBot: false,
	},
	{
		sessionId: "sess_2a5f3c",
		visitorId: "vis_24680",
		country: "GB",
		city: "London",
		path: "/",
		startedAt: new Date(Date.now() - 45000),
		lastActivity: new Date(Date.now() - 3000),
		pageviews: 1,
		isBot: false,
	},
];

// Full dashboard data object
export const mockDashboardData: DashboardData = {
	kpis: mockKPIs,
	trends: {
		pageviews: {
			id: "pageviews-trend",
			label: "Pageviews",
			data: Array.from({ length: 24 }, (_, i) => ({
				timestamp: new Date(Date.now() - (23 - i) * 3600000),
				value: 4000 + Math.random() * 2000,
			})),
		},
		visitors: {
			id: "visitors-trend",
			label: "Visitors",
			data: Array.from({ length: 24 }, (_, i) => ({
				timestamp: new Date(Date.now() - (23 - i) * 3600000),
				value: 600 + Math.random() * 400,
			})),
		},
		sessions: {
			id: "sessions-trend",
			label: "Sessions",
			data: Array.from({ length: 24 }, (_, i) => ({
				timestamp: new Date(Date.now() - (23 - i) * 3600000),
				value: 1200 + Math.random() * 600,
			})),
		},
		eventsByType: [],
		botVsHuman: [],
	},
	content: {
		topPages: mockTopPages,
		topReferrers: mockReferrers,
		entryPages: mockTopPages.slice(0, 5),
		exitPages: mockTopPages.slice(0, 5).reverse(),
	},
	audience: {
		geoByCountry: mockGeoCountry,
		geoByRegion: [],
		geoByCity: [],
		devices: mockDevices,
		browsers: [
			{ browser: "Chrome", count: 65432, percentage: 53.2 },
			{ browser: "Safari", count: 24321, percentage: 19.8 },
			{ browser: "Firefox", count: 18765, percentage: 15.3 },
			{ browser: "Edge", count: 9876, percentage: 8.0 },
			{ browser: "Other", count: 4567, percentage: 3.7 },
		],
		os: [
			{ os: "Windows", count: 45678, percentage: 37.2 },
			{ os: "macOS", count: 34567, percentage: 28.1 },
			{ os: "iOS", count: 21345, percentage: 17.4 },
			{ os: "Android", count: 15678, percentage: 12.8 },
			{ os: "Linux", count: 5543, percentage: 4.5 },
		],
		languages: [
			{ lang: "en-US", count: 54321, percentage: 44.2 },
			{ lang: "en-GB", count: 12345, percentage: 10.0 },
			{ lang: "de-DE", count: 9876, percentage: 8.0 },
			{ lang: "fr-FR", count: 7654, percentage: 6.2 },
			{ lang: "es-ES", count: 5432, percentage: 4.4 },
		],
		screenResolutions: [
			{ resolution: "1920x1080", count: 34567, percentage: 28.1 },
			{ resolution: "1440x900", count: 21345, percentage: 17.4 },
			{ resolution: "2560x1440", count: 15678, percentage: 12.8 },
			{ resolution: "1366x768", count: 12345, percentage: 10.0 },
		],
	},
	quality: {
		botTraffic: mockBotMetrics,
		totalBotEvents: 5181,
		dedupedEventCount: 1234,
		ingestionRate: 847,
		errorRate: 0.04,
		localhostTraffic: 2587,
		eventTypeMix: [
			{ type: "pageview", count: 124892, percentage: 68.2 },
			{ type: "event", count: 45678, percentage: 24.9 },
			{ type: "click", count: 9876, percentage: 5.4 },
			{ type: "error", count: 2765, percentage: 1.5 },
		],
	},
	realtime: {
		recentEvents: mockSignals,
		liveSessions: mockLiveSessions,
		liveSessionCount: 247,
		recentBotDetections: mockSignals.filter((s) => s.category === "Bot Detection"),
	},
	lastUpdated: new Date(),
	dataRange: {
		from: new Date(Date.now() - 24 * 60 * 60 * 1000),
		to: new Date(),
	},
};
