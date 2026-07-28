import { Suspense } from "react";
import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft, Globe, MapPin, Megaphone, Zap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { HourlyHeatmap } from "@/components/hourly-heatmap";
import { VisitorInternalToggle } from "@/components/visitor-internal-toggle";
import {
	VisitorSessionsExplorer,
	type ExplorerSession,
} from "@/components/visitor-sessions-explorer";
import { formatDuration, getFlagEmoji } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
	params: Promise<{ id: string }>;
};

function formatDateTime(value: string | Date | null | undefined): string {
	if (!value) return "Unknown";
	return new Date(value).toLocaleString();
}

function formatDate(value: string | Date | null | undefined): string {
	if (!value) return "Unknown";
	return new Date(value).toLocaleDateString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

function flattenMetaSection(value: unknown): { key: string; value: string }[] {
	if (!value || typeof value !== "object") return [];
	return Object.entries(value as Record<string, unknown>).map(([key, v]) => ({
		key,
		value: typeof v === "object" ? JSON.stringify(v) : String(v),
	}));
}

async function IdentityHeader({ params }: Props) {
	const { id: fingerprint } = await params;
	const { getVisitorProfile } = await import("@/lib/queries");
	const profile = await getVisitorProfile(fingerprint);

	if (!profile) {
		return (
			<div className="bg-card border border-border rounded-sm p-6 text-center text-sm text-muted-foreground">
				Visitor not found.
			</div>
		);
	}

	const { visitor } = profile;

	return (
		<div className="bg-card border border-border rounded-sm p-4 space-y-4">
			<div className="flex items-start justify-between gap-3 flex-wrap">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
						<span className="text-lg">{getFlagEmoji(visitor.country || "") || "👤"}</span>
					</div>
					<div>
						<h1 className="font-mono text-sm font-medium text-foreground">
							{visitor.fingerprint.slice(0, 12)}
						</h1>
						<p className="text-[11px] text-muted-foreground">
							{[visitor.city, visitor.region, visitor.country].filter(Boolean).join(", ") ||
								"Unknown location"}
							{visitor.visitCount > 1
								? ` · returning visitor (${visitor.visitCount} visits)`
								: " · first-time visitor"}
						</p>
					</div>
				</div>
				<VisitorInternalToggle
					fingerprint={visitor.fingerprint}
					initialIsInternal={visitor.isInternal}
				/>
			</div>

			<div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3 text-[11px]">
				<div className="space-y-0.5">
					<p className="text-muted-foreground uppercase tracking-wide text-[10px]">First seen</p>
					<p className="text-foreground">{formatDateTime(visitor.firstSeen)}</p>
				</div>
				<div className="space-y-0.5">
					<p className="text-muted-foreground uppercase tracking-wide text-[10px]">Last seen</p>
					<p className="text-foreground">{formatDateTime(visitor.lastSeen)}</p>
				</div>
				<div className="space-y-0.5">
					<p className="text-muted-foreground uppercase tracking-wide text-[10px]">Visit count</p>
					<p className="text-foreground tabular-nums">{visitor.visitCount}</p>
				</div>
				<div className="space-y-0.5">
					<p className="text-muted-foreground uppercase tracking-wide text-[10px]">Timezone</p>
					<p className="text-foreground">{visitor.timezone || "Unknown"}</p>
				</div>
				<div className="space-y-0.5">
					<p className="text-muted-foreground uppercase tracking-wide text-[10px]">Device</p>
					<p className="text-foreground">
						{visitor.deviceType || "Unknown"}
						{visitor.screenResolution ? ` · ${visitor.screenResolution}` : ""}
					</p>
				</div>
				<div className="space-y-0.5">
					<p className="text-muted-foreground uppercase tracking-wide text-[10px]">OS</p>
					<p className="text-foreground">
						{visitor.os} {visitor.osVersion}
					</p>
				</div>
				<div className="space-y-0.5">
					<p className="text-muted-foreground uppercase tracking-wide text-[10px]">Browser</p>
					<p className="text-foreground">
						{visitor.browser} {visitor.browserVersion}
					</p>
				</div>
				<div className="space-y-0.5">
					<p className="text-muted-foreground uppercase tracking-wide text-[10px]">Language</p>
					<p className="text-foreground">{visitor.language || "Unknown"}</p>
				</div>
			</div>
		</div>
	);
}

function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
	return (
		<div className="bg-card border border-border rounded-sm p-3 space-y-0.5">
			<p className="text-muted-foreground uppercase tracking-wide text-[10px]">{label}</p>
			<p className="text-foreground text-sm font-medium tabular-nums">{value}</p>
			{hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
		</div>
	);
}

async function EngagementOverview({ params }: Props) {
	const { id: fingerprint } = await params;
	const { getVisitorInsights } = await import("@/lib/queries");
	const insights = await getVisitorInsights(fingerprint);
	const { engagement: e, returnPattern: r } = insights;

	return (
		<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
			<StatTile label="Sessions" value={String(e.sessions)} />
			<StatTile label="Total time" value={formatDuration(e.totalDurationMs)} />
			<StatTile label="Avg session" value={formatDuration(e.avgDurationMs)} />
			<StatTile label="Pages / session" value={String(e.avgPageviews)} />
			<StatTile label="Bounce rate" value={`${e.bounceRate}%`} />
			<StatTile label="Pageviews" value={String(e.totalPageviews)} />
			<StatTile
				label="Active days"
				value={String(e.activeDays)}
				hint={e.lifespanDays > 0 ? `over ${e.lifespanDays}d lifespan` : undefined}
			/>
			<StatTile
				label="Returns every"
				value={r.medianGapMs !== null ? `~${formatDuration(r.medianGapMs)}` : "—"}
				hint={
					r.currentGapMs !== null ? `last visit ${formatDuration(r.currentGapMs)} ago` : undefined
				}
			/>
		</div>
	);
}

async function VisitPatterns({ params }: Props) {
	const { id: fingerprint } = await params;
	const { getVisitorInsights } = await import("@/lib/queries");
	const insights = await getVisitorInsights(fingerprint);
	const { returnPattern: r, heatmap, dailyActivity } = insights;

	const recentDays = dailyActivity.slice(-60);
	const maxPageviews = Math.max(1, ...recentDays.map((d) => d.pageviews));

	return (
		<div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
			<HourlyHeatmap
				data={heatmap}
				title="When this visitor is active"
				emptyLabel="Not enough activity yet"
			/>
			<div className="space-y-3">
				<div className="bg-card border border-border rounded-sm">
					<div className="px-3 py-2 border-b border-border">
						<h3 className="text-xs font-medium text-foreground">Return pattern</h3>
					</div>
					<div className="p-3 space-y-2 text-[11px]">
						{r.medianGapMs === null ? (
							<p className="text-muted-foreground">
								Only one session so far — no return pattern yet.
							</p>
						) : (
							<>
								<p className="text-foreground">
									Typically returns after{" "}
									<span className="font-medium">{formatDuration(r.medianGapMs)}</span>
									{r.favoriteDay !== null && r.favoriteHour !== null && (
										<>
											, most active on <span className="font-medium">{r.favoriteDay}</span> around{" "}
											<span className="font-medium">
												{String(r.favoriteHour).padStart(2, "0")}:00
											</span>
										</>
									)}
									.
								</p>
								<div className="grid grid-cols-3 gap-2 text-[10px]">
									<div>
										<p className="text-muted-foreground uppercase tracking-wide">Avg gap</p>
										<p className="text-foreground tabular-nums">{formatDuration(r.avgGapMs)}</p>
									</div>
									<div>
										<p className="text-muted-foreground uppercase tracking-wide">Longest gap</p>
										<p className="text-foreground tabular-nums">{formatDuration(r.longestGapMs)}</p>
									</div>
									<div>
										<p className="text-muted-foreground uppercase tracking-wide">
											Since last visit
										</p>
										<p className="text-foreground tabular-nums">{formatDuration(r.currentGapMs)}</p>
									</div>
								</div>
							</>
						)}
					</div>
				</div>
				<div className="bg-card border border-border rounded-sm">
					<div className="px-3 py-2 border-b border-border flex items-center justify-between">
						<h3 className="text-xs font-medium text-foreground">Activity history</h3>
						<span className="text-[10px] text-muted-foreground">pageviews per day</span>
					</div>
					<div className="p-3">
						{recentDays.length === 0 ? (
							<p className="text-[11px] text-muted-foreground">No activity recorded.</p>
						) : (
							<div className="flex items-end gap-px h-16">
								{recentDays.map((d) => (
									<div
										key={d.day}
										className="flex-1 bg-foreground/60 hover:bg-foreground rounded-t-[1px] transition-colors min-w-[2px]"
										style={{ height: `${Math.max(6, (d.pageviews / maxPageviews) * 100)}%` }}
										title={`${formatDate(d.day)}: ${d.pageviews} pageviews, ${d.sessions} sessions`}
									/>
								))}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

async function GeoAndAcquisition({ params }: Props) {
	const { id: fingerprint } = await params;
	const { getVisitorInsights } = await import("@/lib/queries");
	const insights = await getVisitorInsights(fingerprint);
	const { geoHistory, utmHistory, hosts, customEvents } = insights;

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
			<div className="bg-card border border-border rounded-sm">
				<div className="px-3 py-2 border-b border-border flex items-center gap-1.5">
					<MapPin className="h-3 w-3 text-muted-foreground" />
					<h3 className="text-xs font-medium text-foreground">Locations seen</h3>
				</div>
				<div className="divide-y divide-border">
					{geoHistory.length === 0 && (
						<p className="p-3 text-[11px] text-muted-foreground">No geo data recorded.</p>
					)}
					{geoHistory.map((geo, i) => (
						<div
							key={`${geo.country}-${geo.region}-${geo.city}-${i}`}
							className="flex items-center justify-between px-3 py-1.5 text-[11px] gap-2"
						>
							<Link
								href={
									`/geo?country=${encodeURIComponent(geo.countryCode || "")}${geo.region ? `&region=${encodeURIComponent(geo.region)}` : ""}` as Route
								}
								className="flex items-center gap-1.5 text-foreground truncate hover:underline"
							>
								<span>{getFlagEmoji(geo.countryCode || "") || "🌐"}</span>
								<span className="truncate">
									{[geo.city, geo.region, geo.country].filter(Boolean).join(", ")}
								</span>
							</Link>
							<span
								className="text-muted-foreground tabular-nums shrink-0"
								title="Events from this location"
							>
								{geo.events} · until {formatDate(geo.lastSeen)}
							</span>
						</div>
					))}
				</div>
			</div>

			<div className="space-y-3">
				<div className="bg-card border border-border rounded-sm">
					<div className="px-3 py-2 border-b border-border flex items-center gap-1.5">
						<Megaphone className="h-3 w-3 text-muted-foreground" />
						<h3 className="text-xs font-medium text-foreground">Campaigns & sites</h3>
					</div>
					<div className="divide-y divide-border">
						{utmHistory.length === 0 && hosts.length === 0 && (
							<p className="p-3 text-[11px] text-muted-foreground">No campaign data recorded.</p>
						)}
						{utmHistory.map((utm, i) => (
							<div
								key={`${utm.source}-${utm.campaign}-${i}`}
								className="flex items-center justify-between px-3 py-1.5 text-[11px] gap-2"
							>
								<span className="text-foreground truncate">
									{utm.source}
									{utm.medium ? ` / ${utm.medium}` : ""}
									{utm.campaign ? ` · ${utm.campaign}` : ""}
								</span>
								<span className="text-muted-foreground tabular-nums shrink-0">
									{utm.visits} visit{utm.visits === 1 ? "" : "s"}
								</span>
							</div>
						))}
						{hosts.map((host) => (
							<div
								key={host.host}
								className="flex items-center justify-between px-3 py-1.5 text-[11px] gap-2"
							>
								<span className="flex items-center gap-1.5 text-foreground truncate">
									<Globe className="h-3 w-3 text-muted-foreground shrink-0" />
									{host.host}
								</span>
								<span className="text-muted-foreground tabular-nums shrink-0">{host.count}</span>
							</div>
						))}
					</div>
				</div>

				{customEvents.length > 0 && (
					<div className="bg-card border border-border rounded-sm">
						<div className="px-3 py-2 border-b border-border flex items-center gap-1.5">
							<Zap className="h-3 w-3 text-muted-foreground" />
							<h3 className="text-xs font-medium text-foreground">Custom events</h3>
						</div>
						<div className="divide-y divide-border">
							{customEvents.map((event) => (
								<div
									key={event.name}
									className="flex items-center justify-between px-3 py-1.5 text-[11px] gap-2"
								>
									<span className="text-foreground truncate">{event.name}</span>
									<span className="text-muted-foreground tabular-nums shrink-0">
										{event.count} · last {formatDate(event.lastSeen)}
									</span>
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

async function SessionTimeline({ params }: Props) {
	const { id: fingerprint } = await params;
	const { getVisitorSessions } = await import("@/lib/queries");
	const sessions = await getVisitorSessions(fingerprint);

	const serialized: ExplorerSession[] = sessions.map((s) => ({
		sessionId: s.sessionId,
		startedAt: new Date(s.startedAt).toISOString(),
		endedAt: new Date(s.endedAt).toISOString(),
		durationMs: s.durationMs,
		entryPath: s.entryPath,
		exitPath: s.exitPath,
		referrer: s.referrer,
		pageviews: s.pageviews,
		events: s.events,
		country: s.country,
		deviceType: s.deviceType,
	}));

	return <VisitorSessionsExplorer fingerprint={fingerprint} sessions={serialized} />;
}

async function TopPagesAndReferrers({ params }: Props) {
	const { id: fingerprint } = await params;
	const { getVisitorProfile } = await import("@/lib/queries");
	const profile = await getVisitorProfile(fingerprint);
	if (!profile) return null;

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
			<div className="bg-card border border-border rounded-sm">
				<div className="px-3 py-2 border-b border-border">
					<h3 className="text-xs font-medium text-foreground">Top pages</h3>
				</div>
				<div className="divide-y divide-border">
					{profile.topPages.length === 0 && (
						<p className="p-3 text-[11px] text-muted-foreground">No pageviews yet.</p>
					)}
					{profile.topPages.map((page) => (
						<div
							key={page.path}
							className="flex items-center justify-between px-3 py-1.5 text-[11px]"
						>
							<span className="font-mono text-foreground truncate max-w-[220px]">{page.path}</span>
							<span className="text-muted-foreground tabular-nums">{page.count}</span>
						</div>
					))}
				</div>
			</div>
			<div className="bg-card border border-border rounded-sm">
				<div className="px-3 py-2 border-b border-border">
					<h3 className="text-xs font-medium text-foreground">Referrer history</h3>
				</div>
				<div className="divide-y divide-border">
					{profile.referrers.length === 0 && (
						<p className="p-3 text-[11px] text-muted-foreground">No referrers recorded.</p>
					)}
					{profile.referrers.map((ref) => (
						<div
							key={ref.referrer}
							className="flex items-center justify-between px-3 py-1.5 text-[11px]"
						>
							<span className="flex items-center gap-1.5 text-foreground truncate max-w-[220px]">
								<Globe className="h-3 w-3 text-muted-foreground shrink-0" />
								{ref.referrer}
							</span>
							<span className="text-muted-foreground tabular-nums">{ref.count}</span>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

async function IdentityAndExperiments({ params }: Props) {
	const { id: fingerprint } = await params;
	const { getVisitorProfile } = await import("@/lib/queries");
	const profile = await getVisitorProfile(fingerprint);
	if (!profile) return null;

	const meta = (profile.visitor.meta ?? {}) as Record<string, unknown>;
	const identity = flattenMetaSection(meta.identity);
	const experiments = flattenMetaSection(meta.experiments);

	if (identity.length === 0 && experiments.length === 0) return null;

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
			{identity.length > 0 && (
				<div className="bg-card border border-border rounded-sm">
					<div className="px-3 py-2 border-b border-border">
						<h3 className="text-xs font-medium text-foreground">Identity</h3>
					</div>
					<div className="grid grid-cols-2 gap-x-3 gap-y-1.5 p-3 text-[11px]">
						{identity.map((entry) => (
							<div key={entry.key} className="space-y-0.5 min-w-0">
								<p className="text-muted-foreground uppercase tracking-wide text-[10px] truncate">
									{entry.key}
								</p>
								<p className="text-foreground truncate">{entry.value}</p>
							</div>
						))}
					</div>
				</div>
			)}
			{experiments.length > 0 && (
				<div className="bg-card border border-border rounded-sm">
					<div className="px-3 py-2 border-b border-border">
						<h3 className="text-xs font-medium text-foreground">Experiments</h3>
					</div>
					<div className="grid grid-cols-2 gap-x-3 gap-y-1.5 p-3 text-[11px]">
						{experiments.map((entry) => (
							<div key={entry.key} className="space-y-0.5 min-w-0">
								<p className="text-muted-foreground uppercase tracking-wide text-[10px] truncate">
									{entry.key}
								</p>
								<p className="text-foreground truncate">{entry.value}</p>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

function HeaderSkeleton() {
	return (
		<div className="bg-card border border-border rounded-sm p-4 space-y-4">
			<div className="flex items-center gap-3">
				<Skeleton className="h-10 w-10 rounded-full" />
				<div className="space-y-2">
					<Skeleton className="h-4 w-40" />
					<Skeleton className="h-3 w-24" />
				</div>
			</div>
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				{Array.from({ length: 8 }).map((_, i) => (
					<Skeleton key={i} className="h-8 w-full" />
				))}
			</div>
		</div>
	);
}

function StatRowSkeleton() {
	return (
		<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
			{Array.from({ length: 8 }).map((_, i) => (
				<Skeleton key={i} className="h-16 w-full" />
			))}
		</div>
	);
}

function PanelSkeleton({ className }: { className?: string }) {
	return (
		<div className={cn("bg-card border border-border rounded-sm p-4 space-y-2", className)}>
			<Skeleton className="h-4 w-32" />
			<Skeleton className="h-16 w-full" />
			<Skeleton className="h-16 w-full" />
		</div>
	);
}

function TwoPanelSkeleton() {
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
			<PanelSkeleton />
			<PanelSkeleton />
		</div>
	);
}

export default function VisitorProfilePage({ params }: Props) {
	return (
		<div className="max-w-5xl mx-auto p-4 space-y-3">
			<Link
				href="/"
				className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground"
			>
				<ArrowLeft className="h-3 w-3" />
				Back to dashboard
			</Link>

			<Suspense fallback={<HeaderSkeleton />}>
				<IdentityHeader params={params} />
			</Suspense>

			<Suspense fallback={<StatRowSkeleton />}>
				<EngagementOverview params={params} />
			</Suspense>

			<Suspense fallback={<TwoPanelSkeleton />}>
				<VisitPatterns params={params} />
			</Suspense>

			<Suspense fallback={<PanelSkeleton />}>
				<SessionTimeline params={params} />
			</Suspense>

			<Suspense fallback={<TwoPanelSkeleton />}>
				<GeoAndAcquisition params={params} />
			</Suspense>

			<Suspense fallback={<TwoPanelSkeleton />}>
				<TopPagesAndReferrers params={params} />
			</Suspense>

			<Suspense fallback={null}>
				<IdentityAndExperiments params={params} />
			</Suspense>
		</div>
	);
}
