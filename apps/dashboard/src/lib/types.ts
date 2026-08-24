// =============================================================================
// DATABASE SCHEMA TYPES
// These types mirror the exact Postgres/Drizzle schema for type-safe queries
// =============================================================================

export interface Event {
	id: bigint;
	projectId: string;
	type: "pageview" | "event" | "click" | "error";
	ts: Date;
	path: string | null;
	referrer: string | null;
	origin: string | null;
	host: string | null;
	isLocalhost: boolean;
	ua: string | null;
	lang: string | null;
	deviceType: string | null;
	ipHash: string | null;
	visitorId: string | null;
	sessionId: string | null;
	country: string | null;
	region: string | null;
	city: string | null;
	meta: {
		botDetected?: boolean;
		botReason?: string;
		botConfidence?: number;
		fingerprint?: string;
		[key: string]: unknown;
	} | null;
}

export interface ResumeEvent {
	id: bigint;
	event: string;
	ts: Date;
	path: string | null;
	referrer: string | null;
	origin: string | null;
	host: string | null;
	isLocalhost: boolean | null;
	ua: string | null;
	lang: string | null;
	ipHash: string | null;
	visitorId: string | null;
	country: string | null;
	region: string | null;
	city: string | null;
	deviceType: string | null;
	resumeVersion: string | null;
	meta: Record<string, unknown> | null;
}

export interface Visitor {
	id: bigint;
	fingerprint: string;
	firstSeen: Date;
	lastSeen: Date;
	visitCount: number;
	deviceType: string | null;
	os: string | null;
	osVersion: string | null;
	browser: string | null;
	browserVersion: string | null;
	screenResolution: string | null;
	timezone: string | null;
	language: string | null;
	country: string | null;
	region: string | null;
	city: string | null;
	ipHash: string | null;
	ua: string | null;
	meta: Record<string, unknown> | null;
}

export interface VisitorEvent {
	id: bigint;
	visitorId: bigint;
	eventType: string;
	ts: Date;
	path: string | null;
	referrer: string | null;
	sessionId: string | null;
	durationMs: number | null;
	meta: Record<string, unknown> | null;
}

// =============================================================================
// DASHBOARD DATA TYPES
// Aggregated/computed types for dashboard components
// =============================================================================

export interface KPIMetric {
	id: string;
	label: string;
	value: number | string;
	formattedValue: string;
	unit?: string;
	trend?: {
		value: number;
		direction: "up" | "down" | "flat" | "new";
		isPositive: boolean;
	};
	sparkline?: number[];
}

export interface TimeSeriesPoint {
	timestamp: Date;
	value: number;
}

export type TimeSeriesGranularity = "hour" | "day";

export interface TimeSeries {
	id: string;
	label: string;
	data: TimeSeriesPoint[];
	color?: string;
	granularity?: TimeSeriesGranularity;
}

export interface GeoDistribution {
	country: string;
	countryCode?: string;
	region?: string;
	city?: string;
	count: number;
	percentage: number;
}

export interface ContentMetric {
	path: string;
	host?: string;
	views: number;
	uniqueVisitors: number;
	avgDuration?: number;
	bounceRate?: number;
}

export interface ReferrerMetric {
	referrer: string;
	domain: string;
	visits: number;
	percentage: number;
}

export interface DeviceBreakdown {
	type: string;
	count: number;
	percentage: number;
}

export interface BrowserBreakdown {
	browser: string;
	version?: string;
	count: number;
	percentage: number;
}

export interface OSBreakdown {
	os: string;
	version?: string;
	count: number;
	percentage: number;
}

export interface BotMetric {
	reason: string;
	count: number;
	percentage: number;
	confidence?: number;
}

export interface SignalEvent {
	id: string | number;
	type: "ok" | "info" | "warn" | "error";
	category: string;
	message: string;
	timestamp: Date;
	metadata?: Record<string, unknown>;
}

export interface LiveSession {
	sessionId: string;
	visitorId: string;
	country: string | null;
	city: string | null;
	path: string;
	startedAt: Date;
	lastActivity: Date;
	pageviews: number;
	isBot: boolean;
}

// =============================================================================
// DASHBOARD STATE TYPES
// =============================================================================

export interface TimeRange {
	label: string;
	value: string;
	from: Date;
	to: Date;
}

export interface FilterState {
	timeRange: TimeRange;
	projectId: string | null;
	includeBots: boolean;
	includeLocalhost: boolean;
	eventTypes: ("pageview" | "event" | "click" | "error")[];
}

export interface DashboardState {
	filters: FilterState;
	isLive: boolean;
	refreshInterval: number;
}

// =============================================================================
// DASHBOARD DATA AGGREGATE
// Single object for passing all dashboard data
// =============================================================================

export interface DashboardData {
	// Core KPIs
	kpis: {
		pageviews: KPIMetric;
		uniqueVisitors: KPIMetric;
		sessions: KPIMetric;
		events: KPIMetric;
		botRate: KPIMetric;
		localhostRate: KPIMetric;
		errorCount: KPIMetric;
	};

	// Time series
	trends: {
		pageviews: TimeSeries;
		visitors: TimeSeries;
		sessions: TimeSeries;
		eventsByType: TimeSeries[];
		botVsHuman: TimeSeries[];
	};

	// Content & acquisition
	content: {
		topPages: ContentMetric[];
		topReferrers: ReferrerMetric[];
		entryPages: ContentMetric[];
		exitPages: ContentMetric[];
	};

	// Audience
	audience: {
		geoByCountry: GeoDistribution[];
		geoByRegion: GeoDistribution[];
		geoByCity: GeoDistribution[];
		devices: DeviceBreakdown[];
		browsers: BrowserBreakdown[];
		os: OSBreakdown[];
		languages: { lang: string; count: number; percentage: number }[];
		screenResolutions: { resolution: string; count: number; percentage: number }[];
	};

	// Quality & operations
	quality: {
		botTraffic: BotMetric[];
		totalBotEvents: number;
		dedupedEventCount: number;
		ingestionRate: number;
		errorRate: number;
		localhostTraffic: number;
		eventTypeMix: { type: string; count: number; percentage: number }[];
	};

	// Real-time
	realtime: {
		recentEvents: SignalEvent[];
		liveSessions: LiveSession[];
		liveSessionCount: number;
		recentBotDetections: SignalEvent[];
	};

	// Meta
	lastUpdated: Date;
	dataRange: {
		from: Date;
		to: Date;
	};
}

// =============================================================================
// NAV & UI TYPES
// =============================================================================

export interface NavTab {
	id: string;
	label: string;
	href?: import("next").Route;
	count?: number;
	active?: boolean;
}

export interface BreadcrumbItem {
	label: string;
	href?: import("next").Route;
}

export interface SidebarSection {
	title: string;
	items: {
		id: string;
		label: string;
		icon?: string;
		href?: string;
		badge?: string | number;
		active?: boolean;
	}[];
}

// =============================================================================
// POSTHOG INTEGRATION TYPES
// =============================================================================

export interface PostHogProject {
	id: string;
	label: string;
}

export interface PostHogInsight {
	id: string;
	shortId: string;
	name: string;
	description: string | null;
	lastRefresh: string | null;
	url: string;
	value: number | null;
	sparkline: number[] | null;
}

export interface PostHogSite {
	host: string;
	events: number;
}

export interface PostHogEvent {
	id: string;
	event: string;
	timestamp: string;
	distinctId: string;
	currentUrl: string | null;
	personUrl: string | null;
}

export interface PostHogVisitorDetail {
	distinctId: string;
	personUrl: string;
	totalEvents: number;
	pageviews: number;
	sessions: number;
	firstSeen: string | null;
	lastSeen: string | null;
	daysActive: number;
	browser: string | null;
	os: string | null;
	deviceType: string | null;
	country: string | null;
	city: string | null;
	initialReferrer: string | null;
	topPages: Array<{ path: string; count: number }>;
	eventBreakdown: Array<{ event: string; count: number }>;
	dailyActivity: Array<{ day: string; events: number }>;
}

export interface PostHogSummary {
	series: { day: string; events: number }[];
	totalEvents: number;
	uniquePersons: number;
	pageviews: number;
	sessions: number;
	countries: number;
	allTimeEvents: number;
	allTimePersons: number;
	sites: PostHogSite[];
}
