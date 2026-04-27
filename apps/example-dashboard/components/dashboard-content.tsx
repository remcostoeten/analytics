"use client";

import { useState, useMemo, useEffect } from "react";
import useSWR from "swr";
import { KPICardsGrid } from "@/components/kpi-cards";
import { SignalStream } from "@/components/signal-stream";
import { TopPagesTable, ReferrersTable } from "@/components/data-table";
import { TrendChart } from "@/components/trend-chart";
import { DonutChart } from "@/components/breakdown-chart";
import { DashboardHeader } from "@/components/dashboard-header";
import { GeoMap } from "@/components/geo-map";
import { GeoDetails } from "@/components/geo-details";
import { ReferrerDetailPanel } from "@/components/referrer-detail-panel";
import { WebVitalsCard } from "@/components/web-vitals-card";
import { HourlyHeatmap } from "@/components/hourly-heatmap";
import { SessionStatsCard } from "@/components/session-stats-card";
import { EngagementMetrics } from "@/components/engagement-metrics";
import { TechnologyBreakdown } from "@/components/technology-breakdown";
import { VisitorsTable } from "@/components/visitors-table";
import { EntryExitPages } from "@/components/entry-exit-pages";
import { LiveNowWidget } from "@/components/live-now-widget";
import { RetentionHeatmap } from "@/components/retention-heatmap";
import { SessionPaths } from "@/components/session-paths";
import { CommandPalette, useCommandPalette } from "@/components/command-palette";
import { useRouter, useSearchParams } from "next/navigation";

import type {
	DashboardData,
	BreadcrumbItem,
	SignalEvent,
	KPIMetric,
	GeoDistribution,
} from "@/lib/types";
import {
	AlertTriangle,
	BadgeInfo,
	ChevronRight,
	BarChart3,
	Users,
	Settings2,
	CalendarDays,
	Route,
	Radio,
	X,
} from "lucide-react";
import { cn } from "@/lib/utils";
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

function formatNumber(n: number): string {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
	if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
	return n.toLocaleString();
}

function formatDuration(ms: number): string {
	if (ms < 1000) return `${ms}ms`;
	const seconds = Math.floor(ms / 1000);
	if (seconds < 60) return `${seconds}s`;
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	return `${minutes}m ${remainingSeconds}s`;
}

type DashboardContentProps = {
	data: DashboardData;
	databaseReady?: boolean;
	databaseIssue?: "missing_database_url" | "query_failed";
	breadcrumbs?: BreadcrumbItem[];
	description?: string;
};

type DashboardView = "overview" | "realtime" | "retention" | "behavior" | "technology" | "audience";

type SelectedCountry = GeoDistribution & {
	cities?: number;
	visitors?: number;
};

export function DashboardContent({
	data: initialData,
	databaseReady = true,
	databaseIssue,
	breadcrumbs = [{ label: "Analytics", href: "#" }, { label: "Dashboard" }],
	description = "Simple, user-focused analytics for your personal projects",
}: DashboardContentProps) {
	const [selectedReferrer, setSelectedReferrer] = useState<string | null>(null);
	const [selectedCountry, setSelectedCountry] = useState<SelectedCountry | null>(null);

	const router = useRouter();
	const searchParams = useSearchParams();
	const activeView = (searchParams.get("view") as DashboardView) || "overview";
	const selectedProject = searchParams.get("projectId");
	const timeRange = searchParams.get("timeRange") || "30d";
	const typeFilter = ((searchParams.get("status") as SignalEvent["type"] | null) || "all") as
		| SignalEvent["type"]
		| "all";

	const setActiveView = (view: DashboardView) => {
		const newParams = new URLSearchParams(searchParams.toString());
		newParams.set("view", view);
		router.push(`/?${newParams.toString()}`);
	};

	const setSelectedProject = (projectId: string | null) => {
		const newParams = new URLSearchParams(searchParams.toString());
		if (projectId) {
			newParams.set("projectId", projectId);
		} else {
			newParams.delete("projectId");
		}
		router.push(`/?${newParams.toString()}`);
	};

	const setTimeRange = (range: string) => {
		const newParams = new URLSearchParams(searchParams.toString());
		if (range === "30d") {
			newParams.delete("timeRange");
		} else {
			newParams.set("timeRange", range);
		}
		router.push(`/?${newParams.toString()}`);
	};

	const setTypeFilter = (type: SignalEvent["type"] | "all") => {
		const newParams = new URLSearchParams(searchParams.toString());
		if (type === "all") {
			newParams.delete("status");
		} else {
			newParams.set("status", type);
		}
		router.push(`/?${newParams.toString()}`);
	};

	const { open: paletteOpen, setOpen: setPaletteOpen } = useCommandPalette();
	const canFetch = databaseReady;

	useEffect(() => {
		function openPalette() {
			setPaletteOpen(true);
		}

		window.addEventListener("open-command-palette", openPalette);
		return () => window.removeEventListener("open-command-palette", openPalette);
	}, [setPaletteOpen]);

	const buildQuery = (metric: string, extraParams: string = "") => {
		const params = new URLSearchParams();
		params.set("metric", metric);
		params.set("timeRange", timeRange);
		if (selectedProject) params.set("projectId", selectedProject);
		return `/api/analytics?${params.toString()}${extraParams ? "&" + extraParams : ""}`;
	};

	const { data: projects, error: projectsError } = useSWR(
		canFetch ? `/api/analytics?metric=projects` : null,
		fetcher,
		{
			fallbackData: [],
			refreshInterval: 60000,
		},
	);

	const { data: overview, error: overviewError } = useSWR(
		canFetch ? buildQuery("overview-extended") : null,
		fetcher,
		{
			fallbackData: null,
			refreshInterval: 30000,
		},
	);

	const { data: pages } = useSWR(canFetch ? buildQuery("pages") : null, fetcher, {
		fallbackData: [],
		refreshInterval: 30000,
	});

	const { data: referrers } = useSWR(canFetch ? buildQuery("referrers") : null, fetcher, {
		fallbackData: [],
		refreshInterval: 30000,
	});

	const { data: geo } = useSWR(canFetch ? buildQuery("geo") : null, fetcher, {
		fallbackData: [],
		refreshInterval: 30000,
	});

	const { data: geoDetail } = useSWR(canFetch ? buildQuery("geo-detail") : null, fetcher, {
		fallbackData: null,
		refreshInterval: 60000,
	});

	const { data: devices } = useSWR(canFetch ? buildQuery("devices") : null, fetcher, {
		fallbackData: [],
		refreshInterval: 30000,
	});

	const { data: trend } = useSWR(canFetch ? buildQuery("trend") : null, fetcher, {
		fallbackData: null,
		refreshInterval: 30000,
	});

	const { data: events } = useSWR(canFetch ? buildQuery("events") : null, fetcher, {
		fallbackData: [],
		refreshInterval: 10000,
	});

	const { data: webVitals } = useSWR(canFetch ? buildQuery("web-vitals") : null, fetcher, {
		fallbackData: null,
		refreshInterval: 60000,
	});

	const { data: sessionStats } = useSWR(canFetch ? buildQuery("session-stats") : null, fetcher, {
		fallbackData: null,
		refreshInterval: 30000,
	});

	useSWR(canFetch ? buildQuery("utm-campaigns") : null, fetcher, {
		fallbackData: [],
		refreshInterval: 30000,
	});

	const { data: engagement } = useSWR(canFetch ? buildQuery("engagement") : null, fetcher, {
		fallbackData: null,
		refreshInterval: 30000,
	});

	const { data: heatmap } = useSWR(canFetch ? buildQuery("hourly-heatmap") : null, fetcher, {
		fallbackData: null,
		refreshInterval: 60000,
	});

	const { data: browsers } = useSWR(canFetch ? buildQuery("browsers-detailed") : null, fetcher, {
		fallbackData: initialData.audience.browsers,
		refreshInterval: 60000,
	});

	const { data: operatingSystems } = useSWR(canFetch ? buildQuery("os-detailed") : null, fetcher, {
		fallbackData: initialData.audience.os,
		refreshInterval: 60000,
	});

	const { data: languages } = useSWR(canFetch ? buildQuery("languages") : null, fetcher, {
		fallbackData: initialData.audience.languages,
		refreshInterval: 60000,
	});

	const { data: screenSizes } = useSWR(canFetch ? buildQuery("screen-sizes") : null, fetcher, {
		fallbackData: initialData.audience.screenResolutions,
		refreshInterval: 60000,
	});

	const { data: connectionTypes } = useSWR(
		canFetch ? buildQuery("connection-types") : null,
		fetcher,
		{
			fallbackData: [],
			refreshInterval: 60000,
		},
	);

	const { data: visitors } = useSWR(canFetch ? buildQuery("visitors") : null, fetcher, {
		fallbackData: [],
		refreshInterval: 30000,
	});

	const { data: entryExitPages } = useSWR(
		canFetch ? buildQuery("entry-exit-pages") : null,
		fetcher,
		{
			fallbackData: null,
			refreshInterval: 30000,
		},
	);

	const { data: liveNow } = useSWR(canFetch ? buildQuery("live-now") : null, fetcher, {
		fallbackData: null,
		refreshInterval: 5000,
	});

	const { data: retention } = useSWR(canFetch ? buildQuery("retention") : null, fetcher, {
		fallbackData: null,
		refreshInterval: 60000,
	});

	const { data: paths } = useSWR(canFetch ? buildQuery("paths") : null, fetcher, {
		fallbackData: null,
		refreshInterval: 30000,
	});

	const setupError = isDatabaseError(projectsError) || isDatabaseError(overviewError);
	const setupIssue = setupError ? "missing_database_url" : databaseIssue;

	const kpiArray = useMemo((): KPIMetric[] => {
		if (!overview) return Object.values(initialData.kpis);

		return [
			{
				id: "pageviews",
				label: "Pageviews",
				value: overview.pageviews || 0,
				formattedValue: formatNumber(overview.pageviews || 0),
			},
			{
				id: "unique-visitors",
				label: "Visitors",
				value: overview.uniqueVisitors || 0,
				formattedValue: formatNumber(overview.uniqueVisitors || 0),
			},
			{
				id: "sessions",
				label: "Sessions",
				value: overview.sessions || 0,
				formattedValue: formatNumber(overview.sessions || 0),
			},
			{
				id: "bounce-rate",
				label: "Bounce Rate",
				value: overview.bounceRate || 0,
				formattedValue: `${overview.bounceRate || 0}%`,
			},
			{
				id: "pages-per-session",
				label: "Pages/Session",
				value: overview.pagesPerSession || 0,
				formattedValue: String(overview.pagesPerSession || 0),
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
	}, [overview, initialData.kpis]);

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

		return events.map(
			(e: {
				id: string;
				type: string;
				path: string;
				timestamp: string;
				country: string;
				city: string;
				deviceType: string;
			}) => ({
				id: e.id,
				type: e.type === "error" ? "error" : ("ok" as SignalEvent["type"]),
				category: e.type,
				message: `${e.type} on ${e.path || "/"}${e.country ? ` from ${e.country}` : ""}`,
				timestamp: new Date(e.timestamp),
				metadata: {
					deviceType: e.deviceType,
					city: e.city,
				},
			}),
		);
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

	const viewTabs = [
		{ id: "overview" as DashboardView, label: "Overview", icon: BarChart3 },
		{ id: "realtime" as DashboardView, label: "Live", icon: Radio },
		{ id: "retention" as DashboardView, label: "Retention", icon: CalendarDays },
		{ id: "behavior" as DashboardView, label: "Behavior", icon: Route },
		{ id: "technology" as DashboardView, label: "Tech", icon: Settings2 },
		{ id: "audience" as DashboardView, label: "Audience", icon: Users },
	];

	return (
		<>
			<DashboardHeader typeFilter={typeFilter} onTypeFilterChange={setTypeFilter} />

			<CommandPalette
				open={paletteOpen}
				onOpenChange={setPaletteOpen}
				onViewChange={(view) => setActiveView(view)}
				onTimeRangeChange={setTimeRange}
				onProjectChange={setSelectedProject}
				pages={palettePages}
				referrers={paletteReferrers}
				projects={projects}
				currentView={activeView}
				currentTimeRange={timeRange}
			/>

			<main className="flex-1 overflow-auto bg-background">
				<div className="p-3 space-y-3">
					<div className="flex items-center justify-between">
						<div>
							<nav className="flex items-center gap-1 text-[11px] text-muted-foreground">
								{breadcrumbs.map((item, i) => (
									<span key={i} className="flex items-center gap-1">
										{i > 0 && <ChevronRight className="h-3 w-3" />}
										{item.href ? (
											<a href={item.href} className="hover:text-foreground">
												{item.label}
											</a>
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

					<div className="overflow-x-auto -mx-3 px-3">
						<div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg w-fit min-w-full">
							{viewTabs.map((tab) => (
								<button
									key={tab.id}
									onClick={() => setActiveView(tab.id)}
									className={cn(
										"flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap",
										activeView === tab.id
											? "bg-background text-foreground shadow-sm"
											: "text-muted-foreground hover:text-foreground",
									)}
								>
									<tab.icon className="h-3.5 w-3.5" />
									{tab.label}
								</button>
							))}
						</div>
					</div>

					<KPICardsGrid kpis={kpiArray} />

					{activeView === "overview" && (
						<div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
							<div className="lg:col-span-8 space-y-3">
								<TrendChart data={trendData} title="Pageviews over time" height={140} />
								<GeoMap
									data={geo || initialData.audience.geoByCountry}
									onCountryClick={(country) => setSelectedCountry(country)}
								/>
								<GeoDetails data={geoDetail} />
								<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
									<TopPagesTable data={pages || initialData.content.topPages} />
									<ReferrersTable
										data={referrers || initialData.content.topReferrers}
										onDomainClick={(domain) => setSelectedReferrer(domain)}
									/>
								</div>
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
									<TopPagesTable data={pages || initialData.content.topPages} />
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
								<RetentionHeatmap data={retention} />
								<TrendChart data={trendData} title="Visitor Trend" height={140} />
								<HourlyHeatmap data={heatmap} />
							</div>
							<div className="lg:col-span-4 space-y-3">
								<SessionStatsCard data={sessionStats} />
								<EngagementMetrics data={engagement} />
							</div>
						</div>
					)}

					{activeView === "behavior" && (
						<div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
							<div className="lg:col-span-8 space-y-3">
								<TrendChart data={trendData} title="Pageviews over time" height={140} />
								<SessionPaths data={paths} />
								<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
									<TopPagesTable data={pages || initialData.content.topPages} />
									<EntryExitPages data={entryExitPages} />
								</div>
								<HourlyHeatmap data={heatmap} />
							</div>
							<div className="lg:col-span-4 space-y-3">
								<EngagementMetrics data={engagement} />
								<WebVitalsCard data={webVitals} />
								<SessionStatsCard data={sessionStats} />
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
								<VisitorsTable data={visitors || []} />
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
								<VisitorsTable data={visitors || []} />
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
						className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-lg shadow-xl p-6 w-80 z-50"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="flex items-center gap-3 mb-4">
							{selectedCountry.countryCode && (
								<span className="text-2xl">{getFlagEmoji(selectedCountry.countryCode)}</span>
							)}
							<div>
								<h3 className="text-lg font-semibold text-foreground">{selectedCountry.country}</h3>
								<p className="text-sm text-muted-foreground">
									{selectedCountry.cities || 0} cities
								</p>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div>
								<p className="text-2xl font-bold text-foreground">
									{selectedCountry.count.toLocaleString()}
								</p>
								<p className="text-xs text-muted-foreground">Events</p>
							</div>
							<div>
								<p className="text-2xl font-bold text-foreground">
									{(selectedCountry.visitors || 0).toLocaleString()}
								</p>
								<p className="text-xs text-muted-foreground">Visitors</p>
							</div>
						</div>
						<div className="mt-4 pt-4 border-t border-border">
							<div className="flex items-center justify-between">
								<span className="text-sm text-muted-foreground">Traffic share</span>
								<span className="text-sm font-semibold text-foreground">
									{selectedCountry.percentage.toFixed(1)}%
								</span>
							</div>
						</div>
						<button
							onClick={() => setSelectedCountry(null)}
							className="mt-4 w-full py-2 text-sm bg-muted hover:bg-muted/80 rounded-md transition-colors"
						>
							Close
						</button>
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
	const isPersonalDashboard = typeof window !== "undefined" && 
		window.location.hostname === process.env.NEXT_PUBLIC_PERSONAL_DASHBOARD_HOSTNAME;

	useEffect(() => {
		if (sessionStorage.getItem("demo-notice-dismissed") === "true") {
			setDismissed(true);
		}
	}, []);

	if (dismissed || isPersonalDashboard) return null;

	return (
		<button
			type="button"
			onClick={() => {
				sessionStorage.setItem("demo-notice-dismissed", "true");
				setDismissed(true);
			}}
			className="group relative w-full rounded-md border border-border bg-muted/30 px-3 py-2 text-left hover:bg-muted/50 transition-colors"
		>
			<div className="flex items-center gap-2">
				<BadgeInfo className="h-4 w-4 shrink-0 text-muted-foreground" />
				<span className="text-xs text-muted-foreground">
					All data is illustrative! Learn{" "}
					<Link href="https://docs.analytics.remcostoeten.nl" className="underline">
						here
					</Link>{" "}
					on how to connect your database.
				</span>
			</div>
			<X className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
		</button>
	);
}

function isDatabaseError(error: unknown): boolean {
	const apiError = error as ApiError | undefined;
	return apiError?.info?.code === "missing_database_url";
}

function getFlagEmoji(countryCode: string): string {
	const codePoints = countryCode
		.toUpperCase()
		.split("")
		.map((char) => 127397 + char.charCodeAt(0));
	return String.fromCodePoint(...codePoints);
}
