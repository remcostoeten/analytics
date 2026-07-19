"use client";

import { useMemo } from "react";
import useSWR from "swr";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import { ArrowLeft, ChevronRight, Globe, MapPin, Network, Clock, Users2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumber, formatTimeAgo, getFlagEmoji } from "@/lib/format";
import { GeoDotMap } from "./geo-dot-map";
import { regionName } from "@/lib/geo-names";
import type { GeoExplorerData, GeoVisitorRow } from "@/lib/queries/geo";

const TIME_RANGES = [
	{ value: "24h", label: "24 hours" },
	{ value: "7d", label: "7 days" },
	{ value: "30d", label: "30 days" },
	{ value: "90d", label: "90 days" },
	{ value: "all", label: "All time" },
];

async function fetcher(url: string) {
	const response = await fetch(url);
	const info = await response.json();
	if (!response.ok) throw new Error(info?.message || info?.error || "Geo request failed");
	return info;
}

function levelLabel(level: GeoExplorerData["level"]): string {
	if (level === "world") return "Countries";
	if (level === "country") return "Regions";
	return "Cities";
}

export function GeoExplorer() {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const country = searchParams.get("country");
	const region = searchParams.get("region");
	const timeRange = searchParams.get("timeRange") || "30d";
	const projectId = searchParams.get("projectId");

	const query = useMemo(() => {
		const params = new URLSearchParams({ metric: "geo-explorer", timeRange });
		if (country) params.set("country", country);
		if (region) params.set("region", region);
		if (projectId) params.set("projectId", projectId);
		return `/api/analytics?${params.toString()}`;
	}, [country, region, timeRange, projectId]);

	const { data, isLoading, error } = useSWR<GeoExplorerData>(query, fetcher, {
		keepPreviousData: true,
		revalidateOnFocus: false,
	});

	const visitorsQuery = useMemo(() => {
		const params = new URLSearchParams({ metric: "geo-visitors", timeRange });
		if (country) params.set("country", country);
		if (region) params.set("region", region);
		if (projectId) params.set("projectId", projectId);
		return `/api/analytics?${params.toString()}`;
	}, [country, region, timeRange, projectId]);

	const { data: visitors, isLoading: visitorsLoading } = useSWR<GeoVisitorRow[]>(
		visitorsQuery,
		fetcher,
		{ keepPreviousData: true, revalidateOnFocus: false },
	);

	const navigate = (next: { country?: string | null; region?: string | null }) => {
		const params = new URLSearchParams(searchParams.toString());
		if (next.country === null) {
			params.delete("country");
			params.delete("region");
		} else if (next.country) {
			params.set("country", next.country);
			params.delete("region");
		}
		if (next.region === null) params.delete("region");
		else if (next.region) params.set("region", next.region);
		router.push(`${pathname}?${params.toString()}` as Route);
	};

	const setTimeRange = (range: string) => {
		const params = new URLSearchParams(searchParams.toString());
		if (range === "30d") params.delete("timeRange");
		else params.set("timeRange", range);
		router.push(`${pathname}?${params.toString()}` as Route);
	};

	const drill = (key: string) => {
		if (!country) navigate({ country: key });
		else if (!region) navigate({ region: key });
	};

	const regionDisplay = region ? regionName(country, region) : null;

	return (
		<div className="flex flex-col gap-3 p-3 md:p-4 max-w-[1400px] mx-auto w-full">
			<header className="flex items-center justify-between gap-3 flex-wrap">
				<div className="flex items-center gap-2 min-w-0">
					<Link
						href="/"
						className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
					>
						<ArrowLeft className="h-3.5 w-3.5" />
						Dashboard
					</Link>
					<span className="text-muted-foreground/40">|</span>
					<nav className="flex items-center gap-1 text-sm min-w-0" aria-label="Geo drill-down">
						<button
							onClick={() => navigate({ country: null })}
							className={cn(
								"flex items-center gap-1.5 hover:text-foreground transition-colors",
								country ? "text-muted-foreground" : "text-foreground font-medium",
							)}
						>
							<Globe className="h-3.5 w-3.5" />
							World
						</button>
						{country && (
							<>
								<ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
								<button
									onClick={() => navigate({ region: null })}
									className={cn(
										"flex items-center gap-1.5 hover:text-foreground transition-colors truncate",
										region ? "text-muted-foreground" : "text-foreground font-medium",
									)}
								>
									<span>{getFlagEmoji(country)}</span>
									<span className="truncate">{countryLabel(country)}</span>
								</button>
							</>
						)}
						{regionDisplay && (
							<>
								<ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
								<span className="text-foreground font-medium truncate">{regionDisplay}</span>
							</>
						)}
					</nav>
				</div>
				<div className="flex items-center gap-2">
					{country && (
						<Link
							href={`/?country=${country}${region ? `&region=${encodeURIComponent(region)}` : ""}`}
							className="text-xs px-2.5 py-1.5 rounded-sm border border-border bg-card hover:bg-muted text-foreground transition-colors"
						>
							View filtered dashboard
						</Link>
					)}
					<select
						value={timeRange}
						onChange={(e) => setTimeRange(e.target.value)}
						className="text-xs bg-card border border-border rounded-sm px-2 py-1.5 text-foreground"
						aria-label="Time range"
					>
					{TIME_RANGES.map((r) => (
							<option key={r.value} value={r.value}>
								{r.label}
							</option>
						))}
					</select>
				</div>
			</header>

			{error && (
				<div className="bg-card border border-border rounded-sm p-4 text-sm text-muted-foreground">
					Could not load geo data: {error.message}
				</div>
			)}

			<section className="grid grid-cols-2 md:grid-cols-4 gap-2">
				<StatCard label="Events" value={data?.summary.events} loading={isLoading} />
				<StatCard label="Visitors" value={data?.summary.visitors} loading={isLoading} />
				<StatCard label="Sessions" value={data?.summary.sessions} loading={isLoading} />
				<StatCard
					label="Coordinate coverage"
					value={data ? `${data.quality.coordsKnown}%` : undefined}
					loading={isLoading}
					hint="Share of events with lat/long"
				/>
			</section>

			<section className="grid grid-cols-1 lg:grid-cols-3 gap-3">
				<div className="lg:col-span-2 bg-card border border-border rounded-sm overflow-hidden">
					<div className="px-3 py-2 border-b border-border flex items-center justify-between">
						<h2 className="text-xs font-medium text-foreground flex items-center gap-1.5">
							<MapPin className="h-3.5 w-3.5" />
							{country ? "Visitor locations" : "Traffic map"}
						</h2>
						<span className="text-[10px] text-muted-foreground tabular-nums">
							{data?.points.length ?? 0} location clusters
						</span>
					</div>
					<GeoDotMap
						points={data?.points ?? []}
						breakdown={data?.breakdown ?? []}
						scopedCountry={country}
						onCountryClick={(code) => navigate({ country: code })}
						className="aspect-[2/1]"
					/>
				</div>

				<div className="bg-card border border-border rounded-sm overflow-hidden flex flex-col">
					<div className="px-3 py-2 border-b border-border flex items-center justify-between">
						<h2 className="text-xs font-medium text-foreground">
							{levelLabel(data?.level ?? "world")}
						</h2>
						<span className="text-[10px] text-muted-foreground tabular-nums">
							{data?.breakdown.length ?? 0}
						</span>
					</div>
					<div className="overflow-y-auto max-h-[420px] divide-y divide-border/50">
						{(data?.breakdown ?? []).map((row) => {
							const clickable = data?.level !== "region";
							return (
								<button
									key={row.key}
									onClick={() => clickable && drill(row.key)}
									disabled={!clickable}
									className={cn(
										"w-full text-left px-3 py-2 relative group",
										clickable && "hover:bg-muted/50 cursor-pointer",
									)}
								>
									<div
										className="absolute inset-y-0 left-0 bg-primary/8 group-hover:bg-primary/12 transition-colors"
										style={{ width: `${row.percentage}%` }}
									/>
									<div className="relative flex items-center justify-between gap-2">
										<span className="text-xs text-foreground flex items-center gap-1.5 truncate">
											{data?.level === "world" && row.countryCode && (
												<span>{getFlagEmoji(row.countryCode)}</span>
											)}
											<span className="truncate">{row.name}</span>
											{clickable && (
												<ChevronRight className="h-3 w-3 text-muted-foreground/0 group-hover:text-muted-foreground/70 transition-colors shrink-0" />
											)}
										</span>
										<span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
											{formatNumber(row.visitors)} visitors · {row.percentage.toFixed(1)}%
										</span>
									</div>
								</button>
							);
						})}
						{!isLoading && data?.breakdown.length === 0 && (
							<p className="px-3 py-6 text-xs text-muted-foreground text-center">
								No data at this level for the selected range
							</p>
						)}
					</div>
				</div>
			</section>

			<section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
				<Panel
					icon={<Clock className="h-3.5 w-3.5" />}
					title="Timezones"
					badge={data && data.mismatchShare > 0 ? `${data.mismatchShare}% mismatch` : undefined}
				>
					{(data?.timezones ?? []).map((tz) => (
						<Row
							key={tz.timezone}
							label={tz.timezone.replace(/_/g, " ")}
							value={formatNumber(tz.count)}
							flagged={tz.mismatch}
							flagTitle="Browser timezone contradicts IP country (VPN/proxy likely)"
						/>
					))}
					<EmptyHint show={!isLoading && (data?.timezones.length ?? 0) === 0}>
						Timezone data is collected from SDK v1.7+ onward
					</EmptyHint>
				</Panel>

				<Panel icon={<Network className="h-3.5 w-3.5" />} title="Networks / ISPs">
					{(data?.networks ?? []).map((n) => (
						<Row
							key={n.org}
							label={n.org}
							value={`${formatNumber(n.visitors)} · ${n.percentage}%`}
						/>
					))}
					<EmptyHint show={!isLoading && (data?.networks.length ?? 0) === 0}>
						Requires the optional GeoLite2 ASN database (GEOIP_ASN_MMDB_PATH)
					</EmptyHint>
				</Panel>

				<Panel title="Top pages in this area">
					{(data?.topPages ?? []).map((p) => (
						<Row key={p.path} label={p.path} value={formatNumber(p.count)} mono />
					))}
					<EmptyHint show={!isLoading && (data?.topPages.length ?? 0) === 0}>
						No pageviews
					</EmptyHint>
				</Panel>

				<Panel title="Data quality">
					<QualityBar label="Country" value={data?.quality.countryKnown ?? 0} />
					<QualityBar label="Region" value={data?.quality.regionKnown ?? 0} />
					<QualityBar label="City" value={data?.quality.cityKnown ?? 0} />
					<QualityBar label="Coordinates" value={data?.quality.coordsKnown ?? 0} />
					<QualityBar label="Timezone" value={data?.quality.timezoneKnown ?? 0} />
					<p className="px-3 pt-2 pb-1 text-[10px] text-muted-foreground leading-relaxed">
						City-level IP geolocation clusters around ISP hubs (e.g. Amsterdam for NL cable and
						mobile). Region and coordinates are the more reliable dimensions.
					</p>
				</Panel>
			</section>

			<section className="bg-card border border-border rounded-sm overflow-hidden">
				<div className="px-3 py-2 border-b border-border flex items-center justify-between">
					<h2 className="text-xs font-medium text-foreground flex items-center gap-1.5">
						<Users2 className="h-3.5 w-3.5" />
						Visitors in this area
					</h2>
					<span className="text-[10px] text-muted-foreground tabular-nums">
						{visitors?.length ?? 0} most recent
					</span>
				</div>
				<div className="divide-y divide-border/50">
					{(visitors ?? []).map((v) => (
						<Link
							key={v.visitorId}
							href={`/visitor/${v.visitorId}`}
							className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-muted/50 transition-colors group"
						>
							<span className="flex items-center gap-2 min-w-0">
								<span className="text-xs font-mono text-foreground truncate">
									{v.visitorId.slice(0, 12)}
								</span>
								{v.city && (
									<span className="text-[10px] text-muted-foreground truncate">{v.city}</span>
								)}
								{v.asOrg && (
									<span className="text-[10px] text-muted-foreground/70 truncate hidden md:inline">
										{v.asOrg}
									</span>
								)}
							</span>
							<span className="flex items-center gap-3 text-[10px] text-muted-foreground tabular-nums shrink-0">
								<span>
									{v.sessions} session{v.sessions === 1 ? "" : "s"}
								</span>
								<span>
									{v.events} event{v.events === 1 ? "" : "s"}
								</span>
								<span>{formatTimeAgo(v.lastSeen)}</span>
								<ChevronRight className="h-3 w-3 text-muted-foreground/0 group-hover:text-muted-foreground/70 transition-colors" />
							</span>
						</Link>
					))}
					{!visitorsLoading && (visitors?.length ?? 0) === 0 && (
						<p className="px-3 py-6 text-xs text-muted-foreground text-center">
							No identified visitors in this area for the selected range
						</p>
					)}
				</div>
			</section>
		</div>
	);
}

function countryLabel(code: string): string {
	try {
		return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
	} catch {
		return code;
	}
}

function StatCard({
	label,
	value,
	loading,
	hint,
}: {
	label: string;
	value: number | string | undefined;
	loading: boolean;
	hint?: string;
}) {
	return (
		<div className="bg-card border border-border rounded-sm px-3 py-2.5" title={hint}>
			<p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
			<p className="text-lg font-semibold text-foreground tabular-nums">
				{loading && value === undefined
					? "—"
					: typeof value === "number"
						? formatNumber(value)
						: (value ?? "—")}
			</p>
		</div>
	);
}

function Panel({
	title,
	icon,
	badge,
	children,
}: {
	title: string;
	icon?: React.ReactNode;
	badge?: string;
	children: React.ReactNode;
}) {
	return (
		<div className="bg-card border border-border rounded-sm overflow-hidden">
			<div className="px-3 py-2 border-b border-border flex items-center justify-between gap-2">
				<h3 className="text-xs font-medium text-foreground flex items-center gap-1.5">
					{icon}
					{title}
				</h3>
				{badge && (
					<span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 tabular-nums">
						{badge}
					</span>
				)}
			</div>
			<div className="py-1 max-h-[260px] overflow-y-auto">{children}</div>
		</div>
	);
}

function Row({
	label,
	value,
	flagged,
	flagTitle,
	mono,
}: {
	label: string;
	value: string;
	flagged?: boolean;
	flagTitle?: string;
	mono?: boolean;
}) {
	return (
		<div className="px-3 py-1.5 flex items-center justify-between gap-2">
			<span
				className={cn("text-xs text-foreground truncate", mono && "font-mono text-[11px]")}
				title={flagged ? flagTitle : label}
			>
				{label}
				{flagged && <span className="ml-1.5 text-amber-500">⚠</span>}
			</span>
			<span className="text-[10px] text-muted-foreground tabular-nums shrink-0">{value}</span>
		</div>
	);
}

function QualityBar({ label, value }: { label: string; value: number }) {
	return (
		<div className="px-3 py-1.5">
			<div className="flex items-center justify-between mb-1">
				<span className="text-xs text-foreground">{label}</span>
				<span className="text-[10px] text-muted-foreground tabular-nums">{value}%</span>
			</div>
			<div className="h-1 bg-muted rounded-full overflow-hidden">
				<div className="h-full bg-primary/60 rounded-full" style={{ width: `${value}%` }} />
			</div>
		</div>
	);
}

function EmptyHint({ show, children }: { show: boolean; children: React.ReactNode }) {
	if (!show) return null;
	return <p className="px-3 py-4 text-[11px] text-muted-foreground text-center">{children}</p>;
}
