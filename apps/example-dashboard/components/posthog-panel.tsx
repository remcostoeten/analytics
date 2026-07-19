"use client";

import { ExternalLink, AlertTriangle, Inbox, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import type { PostHogEvent, PostHogInsight, PostHogSummary } from "@/lib/types";

function formatRelativeTime(iso: string | null): string {
	if (!iso) return "—";
	const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
	if (seconds < 60) return "just now";
	if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
	if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
	return `${Math.floor(seconds / 86400)}d ago`;
}

type PostHogNoticeProps = {
	message?: string;
};

export function PostHogNotice({ message }: PostHogNoticeProps) {
	return (
		<div className="rounded-md border border-border bg-muted/30 px-3 py-2">
			<div className="flex items-center gap-2">
				<AlertTriangle className="h-4 w-4 shrink-0 text-muted-foreground" />
				<span className="text-xs text-muted-foreground">
					{message || "Set POSTHOG_API_KEY and POSTHOG_PROJECT_ID to connect PostHog."}
				</span>
			</div>
		</div>
	);
}

type PostHogTrackedSitesProps = {
	data: PostHogSummary | null;
	isLoading?: boolean;
};

export function PostHogTrackedSites({ data, isLoading }: PostHogTrackedSitesProps) {
	if (isLoading && !data) {
		return <Skeleton className="h-14 rounded-sm" />;
	}

	const sites = data?.sites ?? [];

	return (
		<div className="bg-card border border-border rounded-sm px-3 py-2.5">
			<div className="flex items-center justify-between gap-3">
				<div className="flex min-w-0 items-center gap-2">
					<Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
					<span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
						Tracked {sites.length === 1 ? "site" : "sites"}
					</span>
				</div>
				<div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
					<span className="tabular-nums font-medium text-foreground">
						{formatNumber(data?.allTimeEvents ?? 0)}
					</span>
					events all-time
					<span className="text-border">·</span>
					<span className="tabular-nums font-medium text-foreground">
						{formatNumber(data?.allTimePersons ?? 0)}
					</span>
					persons
				</div>
			</div>
			{sites.length === 0 ? (
				<p className="mt-2 text-[11px] text-muted-foreground">
					No hosts detected in the last 30 days.
				</p>
			) : (
				<div className="mt-2 flex flex-wrap gap-1.5">
					{sites.map((site) => (
						<a
							key={site.host}
							href={`https://${site.host}`}
							target="_blank"
							rel="noreferrer"
							className="group inline-flex items-center gap-1.5 rounded border border-border bg-muted/30 px-2 py-1 text-[10px] transition-colors hover:border-primary/40 hover:bg-primary/5"
							title={`${site.host} — ${site.events.toLocaleString()} events`}
						>
							<img
								src={`https://www.google.com/s2/favicons?domain=${site.host}&sz=16`}
								alt=""
								className="h-3 w-3"
								onError={(e) => {
									(e.target as HTMLImageElement).style.display = "none";
								}}
							/>
							<span className="font-mono text-foreground group-hover:text-primary">
								{site.host}
							</span>
							<span className="tabular-nums text-muted-foreground">
								{formatNumber(site.events)}
							</span>
						</a>
					))}
				</div>
			)}
		</div>
	);
}

type PostHogSummaryCardsProps = {
	data: PostHogSummary | null;
	isLoading?: boolean;
};

export function PostHogSummaryCards({ data, isLoading }: PostHogSummaryCardsProps) {
	const pagesPerSession = data && data.sessions > 0 ? data.pageviews / data.sessions : 0;

	const cards = [
		{ label: "Pageviews (7d)", value: formatNumber(data?.pageviews ?? 0) },
		{ label: "Unique persons (7d)", value: formatNumber(data?.uniquePersons ?? 0) },
		{ label: "Sessions (7d)", value: formatNumber(data?.sessions ?? 0) },
		{ label: "Events (7d)", value: formatNumber(data?.totalEvents ?? 0) },
		{ label: "Pages / session", value: pagesPerSession.toFixed(1) },
		{ label: "Countries", value: formatNumber(data?.countries ?? 0) },
	];

	if (isLoading && !data) {
		return (
			<div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
				{cards.map((_, i) => (
					<Skeleton key={i} className="h-16 rounded-sm" />
				))}
			</div>
		);
	}

	return (
		<div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
			{cards.map((card) => (
				<div key={card.label} className="bg-card border border-border rounded-sm px-3 py-2.5">
					<p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
						{card.label}
					</p>
					<span className="text-xl font-semibold text-foreground tabular-nums tracking-tight">
						{card.value}
					</span>
				</div>
			))}
		</div>
	);
}

function Sparkline({ points }: { points: number[] }) {
	if (points.length < 2) return null;
	const max = Math.max(...points);
	const min = Math.min(...points);
	const range = max - min || 1;
	const width = 56;
	const height = 16;
	const step = width / (points.length - 1);
	const path = points
		.map((p, i) => {
			const x = i * step;
			const y = height - ((p - min) / range) * height;
			return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
		})
		.join(" ");

	return (
		<svg width={width} height={height} className="shrink-0 overflow-visible" aria-hidden>
			<path
				d={path}
				fill="none"
				stroke="currentColor"
				strokeWidth={1.25}
				className="text-primary"
			/>
		</svg>
	);
}

type PostHogInsightsListProps = {
	data: PostHogInsight[] | null;
	isLoading?: boolean;
};

export function PostHogInsightsList({ data, isLoading }: PostHogInsightsListProps) {
	const insights = data || [];

	return (
		<div className="bg-card border border-border rounded-sm">
			<div className="px-3 py-2 border-b border-border">
				<h3 className="text-xs font-medium text-foreground">Recent Insights</h3>
			</div>
			{isLoading && insights.length === 0 ? (
				<div className="divide-y divide-border">
					{Array.from({ length: 4 }).map((_, i) => (
						<div key={i} className="px-3 py-2">
							<Skeleton className="h-3 w-48" />
						</div>
					))}
				</div>
			) : insights.length === 0 ? (
				<div className="p-6 text-center">
					<p className="text-[11px] text-muted-foreground">No insights found</p>
				</div>
			) : (
				<div className="divide-y divide-border">
					{insights.map((insight) => (
						<a
							key={insight.id}
							href={insight.url}
							target="_blank"
							rel="noreferrer"
							className="flex items-center gap-3 px-3 py-2 text-[11px] hover:bg-muted/30 transition-colors"
						>
							<div className="min-w-0 flex-1">
								<p className="text-foreground truncate">{insight.name}</p>
								{insight.description && (
									<p className="text-muted-foreground truncate">{insight.description}</p>
								)}
								<span className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
									{formatRelativeTime(insight.lastRefresh)}
									<ExternalLink className="h-2.5 w-2.5" />
								</span>
							</div>
							{insight.value !== null && (
								<div className="flex shrink-0 items-center gap-2">
									{insight.sparkline && insight.sparkline.length > 1 && (
										<Sparkline points={insight.sparkline} />
									)}
									<span className="tabular-nums text-sm font-semibold text-foreground">
										{formatNumber(insight.value)}
									</span>
								</div>
							)}
						</a>
					))}
				</div>
			)}
		</div>
	);
}

const EVENT_STYLES: Record<string, string> = {
	$pageview: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
	$pageleave: "bg-amber-500/10 text-amber-400 border-amber-500/20",
	$autocapture: "bg-sky-500/10 text-sky-400 border-sky-500/20",
	$identify: "bg-violet-500/10 text-violet-400 border-violet-500/20",
	$set: "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20",
};

const DEFAULT_EVENT_STYLE = "bg-primary/10 text-primary border-primary/20";

function EventBadge({ event }: { event: string }) {
	const style = EVENT_STYLES[event] ?? DEFAULT_EVENT_STYLE;
	const label = event.startsWith("$") ? event.slice(1) : event;
	return (
		<span
			className={cn(
				"inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] font-medium leading-none",
				style,
			)}
		>
			{label}
		</span>
	);
}

function prettyUrl(url: string): { host: string; path: string } {
	try {
		const parsed = new URL(url);
		return { host: parsed.host.replace(/^www\./, ""), path: parsed.pathname + parsed.search };
	} catch {
		return { host: "", path: url };
	}
}

type PostHogEventsTableProps = {
	data: PostHogEvent[] | null;
	isLoading?: boolean;
	className?: string;
};

export function PostHogEventsTable({ data, isLoading, className }: PostHogEventsTableProps) {
	const rows = (data || []).slice(0, 25);
	const hasData = rows.length > 0;

	return (
		<div className={cn("bg-card border border-border rounded-sm", className)}>
			<div className="px-3 py-2 border-b border-border">
				<h3 className="text-xs font-medium text-foreground">Recent Events</h3>
			</div>
			{!hasData ? (
				isLoading ? (
					<div className="divide-y divide-border">
						{Array.from({ length: 6 }).map((_, i) => (
							<div key={i} className="px-3 py-2 flex items-center justify-between gap-4">
								<Skeleton className="h-4 w-20" />
								<Skeleton className="h-3 flex-1 max-w-[200px]" />
								<Skeleton className="h-3 w-24" />
								<Skeleton className="h-3 w-10" />
							</div>
						))}
					</div>
				) : (
					<div className="p-6 text-center">
						<Inbox className="h-6 w-6 text-muted-foreground/50 mx-auto mb-2" />
						<p className="text-[11px] text-muted-foreground">No events yet</p>
					</div>
				)
			) : (
				<div className="overflow-x-auto">
					<table className="w-full text-[11px]">
						<thead>
							<tr className="border-b border-border bg-muted/30">
								<th className="px-3 py-1.5 text-left font-medium text-muted-foreground uppercase tracking-wide">
									Event
								</th>
								<th className="px-3 py-1.5 text-left font-medium text-muted-foreground uppercase tracking-wide">
									Page
								</th>
								<th className="px-3 py-1.5 text-left font-medium text-muted-foreground uppercase tracking-wide">
									Distinct ID
								</th>
								<th className="px-3 py-1.5 text-right font-medium text-muted-foreground uppercase tracking-wide">
									Time
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{rows.map((row) => {
								const url = row.currentUrl;
								const parsed = url ? prettyUrl(url) : null;
								return (
									<tr key={row.id} className="hover:bg-muted/30 transition-colors">
										<td className="px-3 py-1.5 align-middle">
											<EventBadge event={row.event} />
										</td>
										<td className="px-3 py-1.5 align-middle">
											{url && parsed ? (
												<a
													href={url}
													target="_blank"
													rel="noreferrer"
													className="group inline-flex max-w-[240px] items-center gap-1 text-foreground hover:text-primary"
													title={url}
												>
													<span className="truncate font-mono text-[10px]">
														{parsed.host && (
															<span className="text-muted-foreground">{parsed.host}</span>
														)}
														<span>{parsed.path}</span>
													</span>
													<ExternalLink className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
												</a>
											) : (
												<span className="text-muted-foreground">—</span>
											)}
										</td>
										<td className="px-3 py-1.5 align-middle">
											<span
												className="block max-w-[120px] truncate font-mono text-[10px] text-muted-foreground"
												title={row.distinctId}
											>
												{row.distinctId || "—"}
											</span>
										</td>
										<td className="px-3 py-1.5 text-right align-middle tabular-nums text-muted-foreground whitespace-nowrap">
											{formatRelativeTime(row.timestamp)}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
