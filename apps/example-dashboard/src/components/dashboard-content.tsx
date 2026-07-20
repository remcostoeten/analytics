"use client";

import type { Route as AppRoute } from "next";

import { useState, useMemo, useEffect } from "react";
import useSWR from "swr";
import { KPICardsGrid } from "@/components/kpi-cards";
import { SignalStream } from "@/components/signal-stream";
import { TopPagesTable, ReferrersTable } from "@/components/data-table";
import { TrendChart } from "@/components/trend-chart";
import { DonutChart, BreakdownChart } from "@/components/breakdown-chart";
import { DashboardHeader } from "@/components/dashboard-header";
import { GeoMap } from "@/components/geo-map";
import { GeoDetails } from "@/components/geo-details";
import { ReferrerDetailPanel } from "@/components/referrer-detail-panel";
import { WebVitalsCard } from "@/components/web-vitals-card";
import { ErrorTrackingCard } from "@/components/error-tracking-card";
import { HourlyHeatmap } from "@/components/hourly-heatmap";
import { SessionStatsCard } from "@/components/session-stats-card";
import { EngagementMetrics } from "@/components/engagement-metrics";
import { TechnologyBreakdown } from "@/components/technology-breakdown";
import { VisitorsTable } from "@/components/visitors-table";
import { EntryExitPages } from "@/components/entry-exit-pages";
import { LiveNowWidget } from "@/components/live-now-widget";
import { RetentionHeatmap } from "@/components/retention-heatmap";
import { SessionPaths } from "@/components/session-paths";
import { UTMCampaignsTable } from "@/components/utm-campaigns-table";
import { ViewTabs } from "@/components/view-tabs";
import { BotTrafficCard } from "@/components/bot-traffic-card";
import { CommandPalette, useCommandPalette } from "@/components/command-palette";
import {
	PostHogNotice,
	PostHogProjectSwitcher,
	PostHogTrackedSites,
	PostHogSummaryCards,
	PostHogInsightsList,
	PostHogEventsTable,
} from "@/components/posthog-panel";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type {
	DashboardData,
	BreadcrumbItem,
	SignalEvent,
	KPIMetric,
	GeoDistribution,
	PostHogProject,
} from "@/lib/types";
import { AlertTriangle, BadgeInfo, ChevronRight, X } from "lucide-react";
import { ChartColumnIncreasingIcon } from "@/components/ui/chart-column-increasing";
import { RadioIcon } from "@/components/ui/radio";
import { CalendarDaysIcon } from "@/components/ui/calendar-days";
import { RouteIcon } from "@/components/ui/route";
import { SlidersHorizontalIcon } from "@/components/ui/sliders-horizontal";
import { UsersIcon } from "@/components/ui/users";
import { ZapIcon } from "@/components/ui/zap";
import { formatNumber, getFlagEmoji } from "@/lib/format";
import { countryName, regionName } from "@/lib/geo-names";
import Link from "next/link";

type ApiError = Error & {
	status?: number;
	info?: {
		code?: string;
		error?: string;
		message?: string;
		requiredEnv?: string;
	};
};

async function fetcher(url: string) {
	const response = await fetch(url);
	const info = await response.json();

	if (!response.ok) {
		const error = new Error(info?.message || info?.error || "Analytics request failed") as ApiError;
		error.status = response.status;
		error.info = info;
		throw error;
	}

	return info;
}

function formatDuration(ms: number): string {
	if (ms < 1000) return `${ms}ms`;
	const seconds = Math.floor(ms / 1000);
	if (seconds < 60) return `${seconds}s`;
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	return `${minutes}m ${remainingSeconds}s`;
}

function formatDecimal(value: number): string {
	return Number(value.toFixed(1)).toString();
}

type DashboardContentProps = {
	data: DashboardData;
	databaseReady?: boolean;
	databaseIssue?: "missing_database_url" | "query_failed";
	breadcrumbs?: BreadcrumbItem[];
	description?: string;
	authUser?: string | null;
};

type DashboardView =
	| "overview"
	| "realtime"
	| "retention"
	| "behavior"
	| "technology"
	| "audience"
	| "posthog";

type SelectedCountry = GeoDistribution & {
	cities?: number;
	visitors?: number;
	countryCode?: string;
};

type CountryDetail = {
	country: string;
	totalEvents: number;
	uniqueVisitors: number;
	sessions: number;
	topCities: { city: string; count: number }[];
	topRegions: { region: string; count: number }[];
	topPages: { path: string; count: number }[];
	topReferrers: { referrer: string; count: number }[];
};

const VISITOR_ID_KEY = "__analytics_visitor_id";
const SELF_FILTER_KEY = "analytics-dashboard-exclude-visitor-id";

function readStoredVisitorId(): string | null {
	try {
		return localStorage.getItem(VISITOR_ID_KEY);
	} catch {
		return null;
	}
}

function readSelfFilterId(): string | null {
	try {
		return localStorage.getItem(SELF_FILTER_KEY);
	} catch {
		return null;
	}
}

export function DashboardContent({
	data: initialData,
	databaseReady = true,
	databaseIssue,
	breadcrumbs = [{ label: "Analytics", href: "/" }, { label: "Dashboard" }],
	description = "Simple, user-focused analytics for your personal projects",
	authUser,
}: DashboardContentProps) {
	const [selectedReferrer, setSelectedReferrer] = useState<string | null>(null);
	const [selectedCountry, setSelectedCountry] = useState<SelectedCountry | null>(null);
	const [currentVisitorId, setCurrentVisitorId] = useState<string | null>(null);
	const [excludedVisitorId, setExcludedVisitorId] = useState<string | null>(null);

	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const activeView = (searchParams.get("view") as DashboardView) || "overview";
	const selectedProject = searchParams.get("projectId");
	const selectedOrigin = searchParams.get("origin");
	const timeRange = searchParams.get("timeRange") || "30d";
	const fromParam = searchParams.get("from");
	const toParam = searchParams.get("to");
	const isCustomRange = !!(fromParam && toParam);
	const typeFilter = ((searchParams.get("status") as SignalEvent["type"] | null) || "all") as
		| SignalEvent["type"]
		| "all";
	const rawGeoCountry = searchParams.get("country");
	const geoCountry =
		rawGeoCountry && /^[A-Za-z]{2}$/.test(rawGeoCountry) ? rawGeoCountry.toUpperCase() : null;
	const geoRegion = geoCountry ? searchParams.get("region") : null;

	const setActiveView = (view: DashboardView) => {
		const newParams = new URLSearchParams(searchParams.toString());
		if (view === "overview") {
			newParams.delete("view");
		} else {
			newParams.set("view", view);
		}
		router.push(buildHref(pathname || "/", newParams));
	};

	const setSelectedProject = (projectId: string | null) => {
		const newParams = new URLSearchParams(searchParams.toString());
		if (projectId) {
			newParams.set("projectId", projectId);
		} else {
			newParams.delete("projectId");
		}
		router.push(buildHref(pathname || "/", newParams));
	};

	const setTimeRange = (range: string) => {
		const newParams = new URLSearchParams(searchParams.toString());
		if (range === "30d") {
			newParams.delete("timeRange");
		} else {
			newParams.set("timeRange", range);
		}
		router.push(buildHref(pathname || "/", newParams));
	};

	const setTypeFilter = (type: SignalEvent["type"] | "all") => {
		const newParams = new URLSearchParams(searchParams.toString());
		if (type === "all") {
			newParams.delete("status");
		} else {
			newParams.set("status", type);
		}
		router.push(buildHref(pathname || "/", newParams));
	};

	function setSelfFilter(enabled: boolean) {
		const visitorId = currentVisitorId || readStoredVisitorId();
		if (!visitorId) return;

		try {
			if (enabled) {
				localStorage.setItem(SELF_FILTER_KEY, visitorId);
				setExcludedVisitorId(visitorId);
			} else {
				localStorage.removeItem(SELF_FILTER_KEY);
				setExcludedVisitorId(null);
			}
		} catch {
			setExcludedVisitorId(enabled ? visitorId : null);
		}
	}

	const { open: paletteOpen, setOpen: setPaletteOpen } = useCommandPalette();
	const canFetch = databaseReady;

	useEffect(() => {
		function openPalette() {
			setPaletteOpen(true);
		}

		window.addEventListener("open-command-palette", openPalette);
		return () => window.removeEventListener("open-command-palette", openPalette);
	}, [setPaletteOpen]);

	useEffect(() => {
		function syncVisitorId() {
			const visitorId = readStoredVisitorId();
			if (!visitorId) return;
			setCurrentVisitorId(visitorId);
		}

		syncVisitorId();
		setExcludedVisitorId(readSelfFilterId());
		const interval = window.setInterval(syncVisitorId, 250);
		const timeout = window.setTimeout(() => window.clearInterval(interval), 10_000);

		return () => {
			window.clearInterval(interval);
			window.clearTimeout(timeout);
		};
	}, []);

	const buildQuery = (metric: string, extraParams: string = "") => {
		const params = new URLSearchParams();
		params.set("metric", metric);
		if (isCustomRange) {
			params.set("from", fromParam!);
			params.set("to", toParam!);
		} else {
			params.set("timeRange", timeRange);
		}
		if (selectedProject) params.set("projectId", selectedProject);
		if (selectedOrigin) params.set("origin", selectedOrigin);
		if (excludedVisitorId) params.set("excludeVisitorId", excludedVisitorId);
		if (geoCountry) {
			params.set("country", geoCountry);
			if (geoRegion) params.set("region", geoRegion);
		}
		return `/api/analytics?${params.toString()}${extraParams ? "&" + extraParams : ""}`;
	};

	function clearGeoFilter() {
		const newParams = new URLSearchParams(searchParams.toString());
		newParams.delete("country");
		newParams.delete("region");
		router.push(buildHref(pathname || "/", newParams));
	}

	function viewKey(views: DashboardView[], metric: string): string | null {
		return canFetch && views.includes(activeView) ? buildQuery(metric) : null;
	}

	const { data: projects, error: projectsError } = useSWR(
		canFetch
			? `/api/analytics?metric=projects${excludedVisitorId ? `&excludeVisitorId=${encodeURIComponent(excludedVisitorId)}` : ""}`
			: null,
		fetcher,
		{
			fallbackData: [],
			refreshInterval: 60000,
		},
	);

	const {
		data: overview,
		error: overviewError,
		isLoading: overviewLoading,
	} = useSWR(canFetch ? buildQuery("overview-extended") : null, fetcher, {
		fallbackData: null,
		refreshInterval: 30000,
		keepPreviousData: true,
	});

	const { data: pages, isLoading: pagesLoading } = useSWR(
		viewKey(["overview", "realtime", "behavior"], "pages"),
		fetcher,
		{
			refreshInterval: 30000,
			keepPreviousData: true,
		},
	);

	const { data: referrers, isLoading: referrersLoading } = useSWR(
		viewKey(["overview"], "referrers"),
		fetcher,
		{
			refreshInterval: 30000,
			keepPreviousData: true,
		},
	);

	const { data: geo } = useSWR(viewKey(["overview", "realtime", "audience"], "geo"), fetcher, {
		refreshInterval: 30000,
		revalidateOnFocus: false,
		keepPreviousData: true,
	});

	const { data: geoDetail } = useSWR(
		viewKey(["overview", "realtime", "audience"], "geo-detail"),
		fetcher,
		{
			fallbackData: null,
			refreshInterval: 60000,
			revalidateOnFocus: false,
			keepPreviousData: true,
		},
	);

	const { data: devices } = useSWR(
		viewKey(["overview", "technology", "audience"], "devices"),
		fetcher,
		{
			fallbackData: [],
			refreshInterval: 30000,
			revalidateOnFocus: false,
			keepPreviousData: true,
		},
	);

	const { data: trend, isLoading: trendLoading } = useSWR(
		viewKey(["overview", "retention"], "trend"),
		fetcher,
		{
			fallbackData: null,
			refreshInterval: 30000,
			keepPreviousData: true,
		},
	);

	const { data: events } = useSWR(
		viewKey(["overview", "realtime", "technology"], "events"),
		fetcher,
		{
			fallbackData: [],
			refreshInterval: 10000,
			keepPreviousData: true,
		},
	);

	const { data: webVitals } = useSWR(viewKey(["behavior", "technology"], "web-vitals"), fetcher, {
		fallbackData: null,
		refreshInterval: 60000,
		revalidateOnFocus: false,
		keepPreviousData: true,
	});

	const { data: errorStats } = useSWR(viewKey(["behavior", "technology"], "errors"), fetcher, {
		fallbackData: null,
		refreshInterval: 60000,
		revalidateOnFocus: false,
		keepPreviousData: true,
	});

	const { data: sessionStats } = useSWR(canFetch ? buildQuery("session-stats") : null, fetcher, {
		fallbackData: null,
		refreshInterval: 30000,
		revalidateOnFocus: false,
		keepPreviousData: true,
	});

	const { data: engagement } = useSWR(viewKey(["retention", "behavior"], "engagement"), fetcher, {
		fallbackData: null,
		refreshInterval: 30000,
		keepPreviousData: true,
	});

	const { data: heatmap } = useSWR(viewKey(["retention", "behavior"], "hourly-heatmap"), fetcher, {
		fallbackData: null,
		refreshInterval: 60000,
		revalidateOnFocus: false,
		keepPreviousData: true,
	});

	const { data: browsers } = useSWR(
		viewKey(["technology", "audience"], "browsers-detailed"),
		fetcher,
		{
			fallbackData: initialData.audience.browsers,
			refreshInterval: 60000,
			revalidateOnFocus: false,
			keepPreviousData: true,
		},
	);

	const { data: operatingSystems } = useSWR(
		viewKey(["technology", "audience"], "os-detailed"),
		fetcher,
		{
			fallbackData: initialData.audience.os,
			refreshInterval: 60000,
			revalidateOnFocus: false,
			keepPreviousData: true,
		},
	);

	const { data: languages } = useSWR(viewKey(["technology", "audience"], "languages"), fetcher, {
		fallbackData: initialData.audience.languages,
		refreshInterval: 60000,
		revalidateOnFocus: false,
		keepPreviousData: true,
	});

	const { data: screenSizes } = useSWR(viewKey(["technology"], "screen-sizes"), fetcher, {
		fallbackData: initialData.audience.screenResolutions,
		refreshInterval: 60000,
		revalidateOnFocus: false,
		keepPreviousData: true,
	});

	const { data: connectionTypes } = useSWR(viewKey(["technology"], "connection-types"), fetcher, {
		fallbackData: [],
		refreshInterval: 60000,
		revalidateOnFocus: false,
		keepPreviousData: true,
	});

	const { data: recurrence } = useSWR(
		viewKey(["technology", "audience"], "visitor-recurrence"),
		fetcher,
		{
			fallbackData: null,
			refreshInterval: 60000,
			revalidateOnFocus: false,
			keepPreviousData: true,
		},
	);

	const { data: entryExitPages } = useSWR(
		viewKey(["realtime", "behavior"], "entry-exit-pages"),
		fetcher,
		{
			fallbackData: null,
			refreshInterval: 30000,
			keepPreviousData: true,
		},
	);

	const { data: liveNow } = useSWR(viewKey(["overview", "realtime"], "live-now"), fetcher, {
		fallbackData: null,
		refreshInterval: 5000,
		keepPreviousData: true,
	});

	const { data: retention, isLoading: retentionLoading } = useSWR(
		viewKey(["retention"], "retention"),
		fetcher,
		{
			fallbackData: null,
			refreshInterval: 60000,
			revalidateOnFocus: false,
			keepPreviousData: true,
		},
	);

	const { data: paths, isLoading: pathsLoading } = useSWR(viewKey(["behavior"], "paths"), fetcher, {
		fallbackData: null,
		refreshInterval: 30000,
		revalidateOnFocus: false,
		keepPreviousData: true,
	});

	const { data: utmCampaigns } = useSWR(viewKey(["overview"], "utm-campaigns"), fetcher, {
		fallbackData: [],
		refreshInterval: 60000,
		revalidateOnFocus: false,
		keepPreviousData: true,
	});

	const { data: botBreakdown } = useSWR(viewKey(["technology"], "bot-breakdown"), fetcher, {
		fallbackData: null,
		refreshInterval: 60000,
		revalidateOnFocus: false,
		keepPreviousData: true,
	});

	const { data: countryDetailData, isLoading: countryDetailLoading } = useSWR<CountryDetail>(
		selectedCountry && canFetch
			? `/api/analytics?metric=country-detail&country=${encodeURIComponent(selectedCountry.country)}${isCustomRange ? `&from=${fromParam}&to=${toParam}` : `&timeRange=${timeRange}`}${selectedProject ? `&projectId=${selectedProject}` : ""}${selectedOrigin ? `&origin=${encodeURIComponent(selectedOrigin)}` : ""}${excludedVisitorId ? `&excludeVisitorId=${encodeURIComponent(excludedVisitorId)}` : ""}`
			: null,
		fetcher,
	);

	const [posthogProject, setPosthogProject] = useState<string | null>(null);

	const { data: posthogProjects } = useSWR<PostHogProject[]>(
		activeView === "posthog" ? "/api/posthog?metric=projects" : null,
		fetcher,
	);

	const posthogProjectParam = posthogProject ? `&project=${posthogProject}` : "";

	const {
		data: posthogSummary,
		error: posthogSummaryError,
		isLoading: posthogSummaryLoading,
	} = useSWR(
		activeView === "posthog" ? `/api/posthog?metric=summary${posthogProjectParam}` : null,
		fetcher,
		{ refreshInterval: 60000 },
	);

	const { data: posthogInsights, isLoading: posthogInsightsLoading } = useSWR(
		activeView === "posthog" ? `/api/posthog?metric=insights${posthogProjectParam}` : null,
		fetcher,
		{ refreshInterval: 60000 },
	);

	const { data: posthogEvents, isLoading: posthogEventsLoading } = useSWR(
		activeView === "posthog" ? `/api/posthog?metric=events${posthogProjectParam}` : null,
		fetcher,
		{ refreshInterval: 15000 },
	);

	const posthogConfigMissing = isPostHogConfigError(posthogSummaryError);

	const setupError = isDatabaseError(projectsError) || isDatabaseError(overviewError);
	const setupIssue = setupError ? "missing_database_url" : databaseIssue;

	const kpiArray = useMemo((): KPIMetric[] => {
		if (!overview) return Object.values(initialData.kpis);

		const bounceRate = sessionStats?.bounceRate ?? 0;
		const pagesPerSession = sessionStats?.avgPageviews ?? 0;

		return [
			{
				id: "pageviews",
				label: "Pageviews",
				value: overview.pageviews || 0,
				formattedValue: formatNumber(overview.pageviews || 0),
				trend: overview.trends?.pageviews,
			},
			{
				id: "unique-visitors",
				label: "Visitors",
				value: overview.uniqueVisitors || 0,
				formattedValue: formatNumber(overview.uniqueVisitors || 0),
				trend: overview.trends?.uniqueVisitors,
			},
			{
				id: "sessions",
				label: "Sessions",
				value: overview.sessions || 0,
				formattedValue: formatNumber(overview.sessions || 0),
				trend: overview.trends?.sessions,
			},
			{
				id: "bounce-rate",
				label: "Bounce Rate",
				value: bounceRate,
				formattedValue: sessionStats ? `${formatDecimal(bounceRate)}%` : "—",
			},
			{
				id: "pages-per-session",
				label: "Pages/Session",
				value: pagesPerSession,
				formattedValue: sessionStats ? formatDecimal(pagesPerSession) : "—",
			},
			{
				id: "avg-time",
				label: "Avg. Time",
				value: overview.avgTimeOnPage || 0,
				formattedValue: formatDuration(overview.avgTimeOnPage || 0),
			},
			{
				id: "countries",
				label: "Countries",
				value: overview.countries || 0,
				formattedValue: String(overview.countries || 0),
			},
		];
	}, [overview, sessionStats, initialData.kpis]);

	const trendData = useMemo(() => {
		if (!trend || !Array.isArray(trend) || trend.length === 0) {
			return initialData.trends.pageviews;
		}

		return {
			id: "pageviews-trend",
			label: "Pageviews",
			data: trend.map((t: { timestamp: string; pageviews: number }) => ({
				timestamp: new Date(t.timestamp),
				value: t.pageviews,
			})),
		};
	}, [trend, initialData.trends.pageviews]);

	const recentSignals = useMemo((): SignalEvent[] => {
		if (!events || !Array.isArray(events)) return initialData.realtime.recentEvents;

		return events.map((e: Omit<SignalEvent, "timestamp"> & { timestamp: string }) => ({
			...e,
			timestamp: new Date(e.timestamp),
		}));
	}, [events, initialData.realtime.recentEvents]);

	const deviceData = useMemo(() => {
		if (!devices || !Array.isArray(devices)) return initialData.audience.devices;
		return devices.map((d: { type: string; count: number; percentage: number }) => ({
			type: d.type,
			count: d.count,
			percentage: d.percentage,
		}));
	}, [devices, initialData.audience.devices]);

	const palettePages = useMemo(() => {
		if (!pages || !Array.isArray(pages)) return [];
		return pages.map((p: { path: string; views: number }) => ({ path: p.path, views: p.views }));
	}, [pages]);

	const paletteReferrers = useMemo(() => {
		if (!referrers || !Array.isArray(referrers)) return [];
		return referrers.map((r: { domain: string; visits: number }) => ({
			domain: r.domain,
			visits: r.visits,
		}));
	}, [referrers]);
	const hasCampaignData = Array.isArray(utmCampaigns) && utmCampaigns.length > 0;

	const viewTabs = [
		{ id: "overview" as DashboardView, label: "Overview", icon: ChartColumnIncreasingIcon },
		{ id: "realtime" as DashboardView, label: "Live", icon: RadioIcon },
		{ id: "retention" as DashboardView, label: "Retention", icon: CalendarDaysIcon },
		{ id: "behavior" as DashboardView, label: "Behavior", icon: RouteIcon },
		{ id: "technology" as DashboardView, label: "Tech", icon: SlidersHorizontalIcon },
		{ id: "audience" as DashboardView, label: "Audience", icon: UsersIcon },
		{ id: "posthog" as DashboardView, label: "PostHog", icon: ZapIcon },
	];

	function buildHref(path: string, params: URLSearchParams): AppRoute {
		const query = params.toString();
		return (query ? `${path}?${query}` : path) as AppRoute;
	}

	function viewHref(view: DashboardView): AppRoute {
		const params = new URLSearchParams(searchParams.toString());
		if (view === "overview") {
			params.delete("view");
		} else {
			params.set("view", view);
		}
		return buildHref(pathname || "/", params);
	}

	function selectPalettePage() {
		setActiveView("behavior");
	}

	function selectPaletteReferrer(domain: string) {
		setSelectedReferrer(domain);
	}

	return (
		<>
			<DashboardHeader
				typeFilter={typeFilter}
				onTypeFilterChange={setTypeFilter}
				selfFilterEnabled={!!excludedVisitorId}
				selfFilterAvailable={!!(currentVisitorId || excludedVisitorId)}
				onSelfFilterChange={setSelfFilter}
				authUser={authUser}
			/>

			<CommandPalette
				open={paletteOpen}
				onOpenChange={setPaletteOpen}
				onViewChange={(view) => setActiveView(view)}
				onTimeRangeChange={setTimeRange}
				onProjectChange={setSelectedProject}
				onPageSelect={selectPalettePage}
				onReferrerSelect={selectPaletteReferrer}
				onTypeFilterChange={setTypeFilter}
				onSelfFilterChange={setSelfFilter}
				selfFilterEnabled={!!excludedVisitorId}
				selfFilterAvailable={!!(currentVisitorId || excludedVisitorId)}
				pages={palettePages}
				referrers={paletteReferrers}
				projects={projects}
				currentView={activeView}
				currentTimeRange={timeRange}
				currentTypeFilter={typeFilter}
			/>

			<main className="flex-1 overflow-auto bg-background">
				<div className="p-3 space-y-3">
					<div className="flex items-center justify-between">
						<div>
							<nav
								aria-label="Breadcrumb"
								className="flex items-center gap-1 text-[11px] text-muted-foreground"
							>
								{breadcrumbs.map((item, i) => (
									<span key={i} className="flex items-center gap-1">
										{i > 0 && <ChevronRight className="h-3 w-3" />}
										{item.href ? (
											item.href.startsWith("http") ? (
												<a
													href={item.href}
													target="_blank"
													rel="noreferrer"
													className="hover:text-foreground"
												>
													{item.label}
												</a>
											) : (
												<Link href={item.href} className="hover:text-foreground">
													{item.label}
												</Link>
											)
										) : (
											<span className="text-foreground">{item.label}</span>
										)}
									</span>
								))}
							</nav>
							<p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>
						</div>
					</div>

					{!databaseReady && <DatabaseNotice issue={setupIssue} />}
					{!databaseReady && <DemoDataNotice />}

					{geoCountry && (
						<div className="flex items-center gap-2">
							<span className="inline-flex items-center gap-1.5 text-[11px] bg-card border border-border rounded-full pl-2.5 pr-1 py-1">
								<span>{getFlagEmoji(geoCountry)}</span>
								<span className="text-foreground">
									{countryName(geoCountry)}
									{geoRegion ? ` · ${regionName(geoCountry, geoRegion)}` : ""}
								</span>
								<button
									type="button"
									onClick={clearGeoFilter}
									aria-label="Clear geo filter"
									className="rounded-full p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
								>
									<X className="h-3 w-3" />
								</button>
							</span>
							<Link
								href={`/geo?country=${geoCountry}${geoRegion ? `&region=${encodeURIComponent(geoRegion)}` : ""}`}
								className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
							>
								Open in Geo Explorer
							</Link>
						</div>
					)}

					<div className="overflow-x-auto -mx-3 px-3">
						<ViewTabs
							tabs={viewTabs}
							activeId={activeView}
							hrefFor={viewHref}
							ariaLabel="Dashboard views"
						/>
					</div>

					{activeView !== "posthog" && <KPICardsGrid kpis={kpiArray} isLoading={overviewLoading} />}

					{activeView === "overview" && (
						<div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
							<div className="lg:col-span-8 space-y-3">
								<TrendChart
									data={trendData}
									title="Pageviews over time"
									height={172}
									isLoading={trendLoading}
								/>
								<GeoMap
									data={geo || initialData.audience.geoByCountry}
									onCountryClick={(country) => setSelectedCountry(country)}
								/>
								<GeoDetails data={geoDetail} />
								<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
									<TopPagesTable
										data={pages || initialData.content.topPages}
										isLoading={pagesLoading}
									/>
									<ReferrersTable
										data={referrers || initialData.content.topReferrers}
										onDomainClick={(domain) => setSelectedReferrer(domain)}
										isLoading={referrersLoading}
									/>
								</div>
								{hasCampaignData && <UTMCampaignsTable data={utmCampaigns} />}
								<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
									<SessionStatsCard data={sessionStats} />
									<DonutChart
										title="Devices"
										data={deviceData.map((d) => ({
											label: d.type,
											value: d.count,
											percentage: d.percentage,
										}))}
									/>
								</div>
							</div>
							<div className="lg:col-span-4 space-y-3">
								<LiveNowWidget data={liveNow} />
								<SignalStream
									signals={recentSignals}
									filter=""
									typeFilter={typeFilter}
									className="h-[400px]"
								/>
							</div>
						</div>
					)}

					{activeView === "realtime" && (
						<div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
							<div className="lg:col-span-8 space-y-3">
								<GeoMap
									data={geo || initialData.audience.geoByCountry}
									onCountryClick={(country) => setSelectedCountry(country)}
								/>
								<GeoDetails data={geoDetail} />
								<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
									<TopPagesTable
										data={pages || initialData.content.topPages}
										isLoading={pagesLoading}
									/>
									<EntryExitPages data={entryExitPages} />
								</div>
							</div>
							<div className="lg:col-span-4 space-y-3">
								<LiveNowWidget data={liveNow} />
								<SignalStream
									signals={recentSignals}
									filter=""
									typeFilter={typeFilter}
									className="h-[500px]"
								/>
							</div>
						</div>
					)}

					{activeView === "retention" && (
						<div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
							<div className="lg:col-span-8 space-y-3">
								<RetentionHeatmap data={retention} isLoading={retentionLoading} />
								<HourlyHeatmap data={heatmap} />
							</div>
							<div className="lg:col-span-4 space-y-3">
								<SessionStatsCard data={sessionStats} />
								<EngagementMetrics data={engagement} />
								<TrendChart
									data={trendData}
									title="Visitor Trend"
									height={120}
									isLoading={trendLoading}
								/>
							</div>
						</div>
					)}

					{activeView === "behavior" && (
						<div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
							<div className="lg:col-span-8 space-y-3">
								<SessionPaths data={paths} isLoading={pathsLoading} />
								<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
									<EntryExitPages data={entryExitPages} />
									<TopPagesTable
										data={pages || initialData.content.topPages}
										isLoading={pagesLoading}
									/>
								</div>
								<HourlyHeatmap data={heatmap} />
							</div>
							<div className="lg:col-span-4 space-y-3">
								<SessionStatsCard data={sessionStats} />
								<EngagementMetrics data={engagement} />
								<WebVitalsCard data={webVitals} />
								<ErrorTrackingCard data={errorStats} />
							</div>
						</div>
					)}

					{activeView === "technology" && (
						<div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
							<div className="lg:col-span-8 space-y-3">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
									<TechnologyBreakdown
										browsers={browsers}
										operatingSystems={operatingSystems}
										languages={languages}
										screenSizes={screenSizes}
										connectionTypes={connectionTypes}
									/>
									<WebVitalsCard data={webVitals} />
								</div>
								<VisitorsTable buildQuery={buildQuery} />
							</div>
							<div className="lg:col-span-4 space-y-3">
								<DonutChart
									title="Devices"
									data={deviceData.map((d) => ({
										label: d.type,
										value: d.count,
										percentage: d.percentage,
									}))}
								/>
								<ErrorTrackingCard data={errorStats} />
								<BotTrafficCard data={botBreakdown} totalEvents={overview?.totalEvents} />
								<SignalStream
									signals={recentSignals}
									filter=""
									typeFilter={typeFilter}
									className="h-[400px]"
								/>
							</div>
						</div>
					)}

					{activeView === "audience" && (
						<div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
							<div className="lg:col-span-8 space-y-3">
								<GeoMap
									data={geo || initialData.audience.geoByCountry}
									onCountryClick={(country) => setSelectedCountry(country)}
								/>
								<GeoDetails data={geoDetail} />
								<VisitorsTable buildQuery={buildQuery} />
							</div>
							<div className="lg:col-span-4 space-y-3">
								<DonutChart
									title="Devices"
									data={deviceData.map((d) => ({
										label: d.type,
										value: d.count,
										percentage: d.percentage,
									}))}
								/>
								<TechnologyBreakdown
									browsers={browsers}
									operatingSystems={operatingSystems}
									languages={languages}
								/>
								<div className="bg-card border border-border rounded-sm px-3 py-2.5">
									<p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
										Returning rate
									</p>
									<span className="mt-1 block text-xl font-semibold text-foreground tabular-nums tracking-tight">
										{recurrence ? `${recurrence.returningRate.toFixed(1)}%` : "—"}
									</span>
								</div>
								<BreakdownChart
									title="Visit count distribution"
									data={(recurrence?.distribution ?? []).map(
										(d: { bucket: string; count: number }) => {
											const total = (recurrence?.distribution ?? []).reduce(
												(sum: number, x: { count: number }) => sum + x.count,
												0,
											);
											return {
												label: `${d.bucket} visits`,
												value: d.count,
												percentage: total > 0 ? (d.count / total) * 100 : 0,
											};
										},
									)}
								/>
							</div>
						</div>
					)}

					{activeView === "posthog" && (
						<div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
							<div className="lg:col-span-8 space-y-3">
								{posthogConfigMissing && (
									<PostHogNotice message={(posthogSummaryError as ApiError)?.info?.message} />
								)}
								<PostHogProjectSwitcher
									projects={posthogProjects ?? null}
									activeProject={posthogProject}
									onSelect={setPosthogProject}
								/>
								<PostHogTrackedSites data={posthogSummary} isLoading={posthogSummaryLoading} />
								<PostHogSummaryCards data={posthogSummary} isLoading={posthogSummaryLoading} />
								<PostHogEventsTable
									data={posthogEvents}
									isLoading={posthogEventsLoading}
									projectId={posthogProject}
								/>
							</div>
							<div className="lg:col-span-4 space-y-3">
								<PostHogInsightsList data={posthogInsights} isLoading={posthogInsightsLoading} />
							</div>
						</div>
					)}
				</div>
			</main>

			<ReferrerDetailPanel
				domain={selectedReferrer}
				timeRange={timeRange}
				onClose={() => setSelectedReferrer(null)}
			/>

			{selectedCountry && (
				<div
					className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
					onClick={() => setSelectedCountry(null)}
				>
					<div
						role="dialog"
						aria-modal="true"
						aria-labelledby="country-modal-title"
						className="fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-[520px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-xl"
						onClick={(e) => e.stopPropagation()}
					>
						{countryDetailLoading || !countryDetailData ? (
							<div className="flex items-center justify-center p-12">
								<div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
							</div>
						) : (
							<>
								<div className="px-5 py-4 border-b border-border shrink-0">
									<div className="flex items-center gap-3">
										{selectedCountry.countryCode && (
											<span className="text-3xl">{getFlagEmoji(selectedCountry.countryCode)}</span>
										)}
										<div>
											<h3
												id="country-modal-title"
												className="text-lg font-semibold text-foreground"
											>
												{selectedCountry.country}
											</h3>
											<p className="text-sm text-muted-foreground">Country details</p>
										</div>
										{selectedCountry.countryCode && (
											<button
												type="button"
												onClick={() => {
													const newParams = new URLSearchParams(searchParams.toString());
													newParams.set("country", selectedCountry.countryCode!);
													newParams.delete("region");
													setSelectedCountry(null);
													router.push(buildHref(pathname || "/", newParams));
												}}
												className="ml-auto text-xs px-2.5 py-1.5 rounded-sm border border-border bg-card hover:bg-muted text-foreground transition-colors"
											>
												Filter dashboard
											</button>
										)}
									</div>
								</div>

								<div className="overflow-y-auto flex-1 p-5 space-y-5">
									<div className="grid grid-cols-4 gap-3">
										<div className="bg-muted/50 rounded-lg p-3 text-center">
											<p className="text-xl font-bold text-foreground">
												{countryDetailData.totalEvents.toLocaleString()}
											</p>
											<p className="text-[10px] text-muted-foreground uppercase tracking-wider">
												Events
											</p>
										</div>
										<div className="bg-muted/50 rounded-lg p-3 text-center">
											<p className="text-xl font-bold text-foreground">
												{countryDetailData.uniqueVisitors.toLocaleString()}
											</p>
											<p className="text-[10px] text-muted-foreground uppercase tracking-wider">
												Visitors
											</p>
										</div>
										<div className="bg-muted/50 rounded-lg p-3 text-center">
											<p className="text-xl font-bold text-foreground">
												{countryDetailData.sessions.toLocaleString()}
											</p>
											<p className="text-[10px] text-muted-foreground uppercase tracking-wider">
												Sessions
											</p>
										</div>
										<div className="bg-muted/50 rounded-lg p-3 text-center">
											<p className="text-xl font-bold text-foreground">
												{countryDetailData.topCities.length}
											</p>
											<p className="text-[10px] text-muted-foreground uppercase tracking-wider">
												Cities
											</p>
										</div>
									</div>

									{countryDetailData.topCities.length > 0 && (
										<div>
											<h4 className="text-xs font-semibold text-foreground mb-2">Top Cities</h4>
											<div className="flex flex-wrap gap-1.5">
												{countryDetailData.topCities.map((c) => (
													<span
														key={c.city}
														className="inline-flex items-center gap-1.5 px-2 py-1 bg-muted/50 rounded text-[11px]"
													>
														<span className="text-foreground">{c.city}</span>
														<span className="text-muted-foreground">
															{c.count.toLocaleString()}
														</span>
													</span>
												))}
											</div>
										</div>
									)}

									{countryDetailData.topRegions.length > 0 && (
										<div>
											<h4 className="text-xs font-semibold text-foreground mb-2">Top Regions</h4>
											<div className="flex flex-wrap gap-1.5">
												{countryDetailData.topRegions.map((r) => (
													<span
														key={r.region}
														className="inline-flex items-center gap-1.5 px-2 py-1 bg-muted/50 rounded text-[11px]"
													>
														<span className="text-foreground">{r.region}</span>
														<span className="text-muted-foreground">
															{r.count.toLocaleString()}
														</span>
													</span>
												))}
											</div>
										</div>
									)}

									{countryDetailData.topPages.length > 0 && (
										<div>
											<h4 className="text-xs font-semibold text-foreground mb-2">Top Pages</h4>
											<div className="space-y-1">
												{countryDetailData.topPages.slice(0, 5).map((p) => (
													<div
														key={p.path}
														className="flex items-center justify-between text-[11px] px-2 py-1.5 bg-muted/30 rounded"
													>
														<span className="text-foreground truncate max-w-[300px]">
															{p.path || "/"}
														</span>
														<span className="text-muted-foreground tabular-nums shrink-0 ml-2">
															{p.count.toLocaleString()}
														</span>
													</div>
												))}
											</div>
										</div>
									)}

									{countryDetailData.topReferrers.length > 0 && (
										<div>
											<h4 className="text-xs font-semibold text-foreground mb-2">Top Sources</h4>
											<div className="space-y-1">
												{countryDetailData.topReferrers.slice(0, 4).map((r) => (
													<div
														key={r.referrer}
														className="flex items-center justify-between text-[11px] px-2 py-1.5 bg-muted/30 rounded"
													>
														<span className="text-foreground truncate max-w-[300px]">
															{r.referrer}
														</span>
														<span className="text-muted-foreground tabular-nums shrink-0 ml-2">
															{r.count.toLocaleString()}
														</span>
													</div>
												))}
											</div>
										</div>
									)}
								</div>

								<div className="px-5 py-3 border-t border-border shrink-0">
									<button
										onClick={() => setSelectedCountry(null)}
										aria-label="Close country details"
										className="w-full py-2 text-sm bg-muted hover:bg-muted/80 rounded-md transition-colors"
									>
										Close
									</button>
								</div>
							</>
						)}
					</div>
				</div>
			)}
		</>
	);
}

function DatabaseNotice({ issue }: { issue?: "missing_database_url" | "query_failed" }) {
	const [dismissed, setDismissed] = useState(false);

	useEffect(() => {
		if (sessionStorage.getItem("db-notice-dismissed") === "true") {
			setDismissed(true);
		}
	}, []);

	if (dismissed) return null;

	const detail =
		issue === "query_failed"
			? "Database unavailable. Check Neon connection and server logs."
			: "Add DATABASE_URL to connect your database.";

	return (
		<button
			type="button"
			onClick={() => {
				sessionStorage.setItem("db-notice-dismissed", "true");
				setDismissed(true);
			}}
			className="group relative w-full rounded-md border border-border bg-muted/30 px-3 py-2 text-left hover:bg-muted/50 transition-colors"
		>
			<div className="flex items-center gap-2">
				<AlertTriangle className="h-4 w-4 shrink-0 text-muted-foreground" />
				<span className="text-xs text-muted-foreground">{detail}</span>
			</div>
			<X className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
		</button>
	);
}

function DemoDataNotice() {
	const [dismissed, setDismissed] = useState(false);
	const [isPersonal, setIsPersonal] = useState(false);

	useEffect(() => {
		if (sessionStorage.getItem("demo-notice-dismissed") === "true") setDismissed(true);
		if (window.location.hostname === process.env.NEXT_PUBLIC_PERSONAL_DASHBOARD_HOSTNAME) {
			setIsPersonal(true);
		}
	}, []);

	if (dismissed || isPersonal) return null;

	return (
		<div className="group relative w-full rounded-md border border-border bg-muted/30 px-3 py-2 text-left">
			<div className="flex items-center gap-2">
				<BadgeInfo className="h-4 w-4 shrink-0 text-muted-foreground" />
				<span className="text-xs text-muted-foreground">
					All data is illustrative! Learn{" "}
					<Link
						href="https://docs.analytics.remcostoeten.nl"
						target="_blank"
						rel="noreferrer"
						className="underline hover:text-foreground"
					>
						here
					</Link>{" "}
					on how to connect your database.
				</span>
			</div>
			<button
				type="button"
				onClick={() => {
					sessionStorage.setItem("demo-notice-dismissed", "true");
					setDismissed(true);
				}}
				aria-label="Dismiss demo data notice"
				className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
			>
				<X className="h-3.5 w-3.5" />
			</button>
		</div>
	);
}

function isDatabaseError(error: unknown): boolean {
	const apiError = error as ApiError | undefined;
	return apiError?.info?.code === "missing_database_url";
}

function isPostHogConfigError(error: unknown): boolean {
	const apiError = error as ApiError | undefined;
	return apiError?.info?.code === "missing_posthog_config";
}
