"use client";

import { useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import useSWR from "swr";
import { ExternalLink, AlertTriangle, Inbox, Globe, Ban, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import type {
	PostHogEvent,
	PostHogInsight,
	PostHogSummary,
	PostHogVisitorDetail,
} from "@/lib/types";

type HighlightRect = {
	left: number;
	top: number;
	width: number;
	height: number;
};

function useHoverHighlight() {
	const containerRef = useRef<HTMLDivElement>(null);
	const [rect, setRect] = useState<HighlightRect | null>(null);
	const [settled, setSettled] = useState(false);

	function onItemEnter(event: ReactMouseEvent<HTMLElement>) {
		const container = containerRef.current;
		if (!container) return;
		const containerBox = container.getBoundingClientRect();
		const box = event.currentTarget.getBoundingClientRect();
		setRect({
			left: box.left - containerBox.left,
			top: box.top - containerBox.top,
			width: box.width,
			height: box.height,
		});
		requestAnimationFrame(() => setSettled(true));
	}

	function onContainerLeave() {
		setRect(null);
		setSettled(false);
	}

	return { containerRef, rect, settled, onItemEnter, onContainerLeave };
}

type HoverHighlightProps = {
	rect: HighlightRect | null;
	settled: boolean;
	className?: string;
};

function HoverHighlight({ rect, settled, className }: HoverHighlightProps) {
	if (!rect) return null;
	return (
		<div
			aria-hidden
			className={cn(
				"pointer-events-none absolute left-0 top-0 rounded-sm bg-foreground/[0.06]",
				settled
					? "transition-[transform,width,height,opacity] duration-200 ease-out"
					: "opacity-0",
				className,
			)}
			style={{
				transform: `translate(${rect.left}px, ${rect.top}px)`,
				width: rect.width,
				height: rect.height,
			}}
		/>
	);
}

function jsonFetcher(url: string) {
	return fetch(url).then((response) => {
		if (!response.ok) throw new Error(`Request failed: ${response.status}`);
		return response.json();
	});
}

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
		return (
			<div className="bg-card border border-border rounded-sm px-3 py-2.5">
				<div className="flex items-center justify-between gap-3">
					<div className="flex items-center gap-2">
						<Skeleton className="h-3.5 w-3.5 rounded-full" />
						<Skeleton className="h-3 w-24" />
					</div>
					<Skeleton className="h-3 w-40" />
				</div>
				<div className="mt-2 flex flex-wrap gap-1.5">
					{Array.from({ length: 3 }).map((_, i) => (
						<Skeleton key={i} className="h-6 w-28 rounded" />
					))}
				</div>
			</div>
		);
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
	const { containerRef, rect, settled, onItemEnter, onContainerLeave } = useHoverHighlight();
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
				{cards.map((card) => (
					<div key={card.label} className="bg-card border border-border rounded-sm px-3 py-2.5">
						<Skeleton className="h-3 w-20" />
						<Skeleton className="mt-1.5 h-6 w-14" />
					</div>
				))}
			</div>
		);
	}

	return (
		<div
			ref={containerRef}
			onMouseLeave={onContainerLeave}
			className="relative grid grid-cols-2 gap-2 sm:grid-cols-3"
		>
			<HoverHighlight rect={rect} settled={settled} className="z-[1]" />
			{cards.map((card) => (
				<div
					key={card.label}
					onMouseEnter={onItemEnter}
					className="relative bg-card border border-border rounded-sm px-3 py-2.5 transition-colors hover:border-foreground/20"
				>
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
						<div key={i} className="flex items-center gap-3 px-3 py-2">
							<div className="min-w-0 flex-1">
								<Skeleton className="h-3 w-40" />
								<Skeleton className="mt-1.5 h-2.5 w-24" />
							</div>
							<Skeleton className="h-4 w-14 shrink-0" />
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

const VISITOR_COLORS = [
	"bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
	"bg-sky-500/10 text-sky-400 border-sky-500/20",
	"bg-violet-500/10 text-violet-400 border-violet-500/20",
	"bg-amber-500/10 text-amber-400 border-amber-500/20",
	"bg-rose-500/10 text-rose-400 border-rose-500/20",
	"bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20",
	"bg-teal-500/10 text-teal-400 border-teal-500/20",
	"bg-orange-500/10 text-orange-400 border-orange-500/20",
	"bg-lime-500/10 text-lime-400 border-lime-500/20",
	"bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
];

function visitorColor(distinctId: string): string {
	let hash = 0;
	for (let i = 0; i < distinctId.length; i++) {
		hash = (hash * 31 + distinctId.charCodeAt(i)) | 0;
	}
	return VISITOR_COLORS[Math.abs(hash) % VISITOR_COLORS.length];
}

type VisitorBadgeProps = {
	distinctId: string;
	active: boolean;
	onToggle: () => void;
};

function VisitorBadge({ distinctId, active, onToggle }: VisitorBadgeProps) {
	return (
		<button
			type="button"
			onClick={onToggle}
			title={active ? `Stop filtering on ${distinctId}` : `Show only events from ${distinctId}`}
			className={cn(
				"inline-flex max-w-[140px] items-center rounded border px-1.5 py-0.5 font-mono text-[10px] leading-none transition-all",
				visitorColor(distinctId),
				active ? "ring-1 ring-current" : "hover:brightness-125",
			)}
		>
			<span className="truncate">{distinctId}</span>
		</button>
	);
}

function formatDate(iso: string | null): string {
	if (!iso) return "—";
	return new Date(iso).toLocaleDateString(undefined, {
		day: "numeric",
		month: "short",
		year: "numeric",
	});
}

type VisitorDetailCardProps = {
	distinctId: string;
	onClose: () => void;
};

function VisitorDetailCard({ distinctId, onClose }: VisitorDetailCardProps) {
	const { data, error, isLoading, mutate } = useSWR<PostHogVisitorDetail>(
		`/api/posthog?metric=visitor&distinctId=${encodeURIComponent(distinctId)}`,
		jsonFetcher,
	);

	return (
		<div className="border-b border-border bg-muted/20 px-3 py-2.5">
			<div className="flex items-center justify-between gap-2">
				<div className="flex min-w-0 items-center gap-2">
					<span
						className={cn(
							"inline-flex max-w-[220px] items-center rounded border px-1.5 py-0.5 font-mono text-[10px] leading-none",
							visitorColor(distinctId),
						)}
					>
						<span className="truncate">{distinctId}</span>
					</span>
					{data && (
						<a
							href={data.personUrl}
							target="_blank"
							rel="noreferrer"
							className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
						>
							Open in PostHog
							<ExternalLink className="h-2.5 w-2.5" />
						</a>
					)}
				</div>
				<button
					type="button"
					onClick={onClose}
					title="Close visitor details"
					className="text-muted-foreground hover:text-foreground"
				>
					<X className="h-3.5 w-3.5" />
				</button>
			</div>

			{error && !data ? (
				<div className="mt-2 flex items-center gap-2">
					<AlertTriangle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
					<span className="text-[11px] text-muted-foreground">
						Failed to load visitor details.
					</span>
					<button
						type="button"
						onClick={() => mutate()}
						className="text-[11px] text-foreground underline underline-offset-2 hover:text-primary"
					>
						Retry
					</button>
				</div>
			) : (
				<VisitorDetailBody data={data ?? null} isLoading={isLoading} />
			)}
		</div>
	);
}

type VisitorDetailBodyProps = {
	data: PostHogVisitorDetail | null;
	isLoading: boolean;
};

function VisitorDetailBody({ data, isLoading }: VisitorDetailBodyProps) {
	const { containerRef, rect, settled, onItemEnter, onContainerLeave } = useHoverHighlight();
	const stats = [
		{ label: "Events", value: data ? formatNumber(data.totalEvents) : null },
		{ label: "Pageviews", value: data ? formatNumber(data.pageviews) : null },
		{ label: "Sessions", value: data ? formatNumber(data.sessions) : null },
		{ label: "Days active", value: data ? formatNumber(data.daysActive) : null },
		{ label: "First seen", value: data ? formatDate(data.firstSeen) : null },
		{ label: "Last seen", value: data ? formatRelativeTime(data.lastSeen) : null },
	];

	const profile = data
		? [
				data.browser,
				data.os,
				data.deviceType,
				[data.city, data.country].filter(Boolean).join(", ") || null,
			].filter((entry): entry is string => Boolean(entry))
		: [];

	return (
		<>
			<div
				ref={containerRef}
				onMouseLeave={onContainerLeave}
				className="relative mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6"
			>
				<HoverHighlight rect={rect} settled={settled} />
				{stats.map((stat) => (
					<div key={stat.label} onMouseEnter={onItemEnter} className="relative rounded-sm p-1 -m-1">
						<p className="text-[10px] uppercase tracking-wide text-muted-foreground">
							{stat.label}
						</p>
						{stat.value === null ? (
							<Skeleton className="mt-1 h-4 w-12" />
						) : (
							<p className="text-sm font-semibold tabular-nums text-foreground">{stat.value}</p>
						)}
					</div>
				))}
			</div>

			{isLoading && !data ? (
				<div className="mt-2 flex flex-wrap gap-1.5">
					{Array.from({ length: 4 }).map((_, i) => (
						<Skeleton key={i} className="h-5 w-20 rounded" />
					))}
				</div>
			) : (
				<>
					{(profile.length > 0 || data?.initialReferrer) && (
						<div className="mt-2 flex flex-wrap items-center gap-1.5">
							{profile.map((entry) => (
								<span
									key={entry}
									className="rounded border border-border bg-muted/30 px-1.5 py-0.5 text-[10px] text-muted-foreground"
								>
									{entry}
								</span>
							))}
							{data?.initialReferrer && (
								<span
									className="max-w-[220px] truncate rounded border border-border bg-muted/30 px-1.5 py-0.5 text-[10px] text-muted-foreground"
									title={`First referrer: ${data.initialReferrer}`}
								>
									via {prettyUrl(data.initialReferrer).host || data.initialReferrer}
								</span>
							)}
						</div>
					)}

					{data && (
						<div className="mt-3 grid gap-3 sm:grid-cols-3">
							<div>
								<p className="text-[10px] uppercase tracking-wide text-muted-foreground">
									Top pages
								</p>
								{data.topPages.length === 0 ? (
									<p className="mt-1 text-[11px] text-muted-foreground">No pageviews</p>
								) : (
									<ul className="mt-1 space-y-0.5">
										{data.topPages.map((page) => (
											<li
												key={page.path}
												className="flex items-center justify-between gap-2 text-[11px]"
											>
												<span className="truncate font-mono text-[10px] text-foreground">
													{page.path}
												</span>
												<span className="tabular-nums text-muted-foreground">
													{formatNumber(page.count)}
												</span>
											</li>
										))}
									</ul>
								)}
							</div>
							<div>
								<p className="text-[10px] uppercase tracking-wide text-muted-foreground">
									Events
								</p>
								<div className="mt-1 flex flex-wrap gap-1">
									{data.eventBreakdown.map((entry) => (
										<span key={entry.event} className="inline-flex items-center gap-1">
											<EventBadge event={entry.event} />
											<span className="text-[10px] tabular-nums text-muted-foreground">
												{formatNumber(entry.count)}
											</span>
										</span>
									))}
								</div>
							</div>
							<div>
								<p className="text-[10px] uppercase tracking-wide text-muted-foreground">
									Activity (30d)
								</p>
								{data.dailyActivity.length > 1 ? (
									<div className="mt-1.5 text-primary">
										<Sparkline points={data.dailyActivity.map((entry) => entry.events)} />
									</div>
								) : (
									<p className="mt-1 text-[11px] text-muted-foreground">
										Active on {data.dailyActivity.length === 1 ? "one day" : "no days"} in
										the last 30
									</p>
								)}
							</div>
						</div>
					)}
				</>
			)}
		</>
	);
}

type PostHogEventsTableProps = {
	data: PostHogEvent[] | null;
	isLoading?: boolean;
	className?: string;
};

export function PostHogEventsTable({ data, isLoading, className }: PostHogEventsTableProps) {
	const [focusedId, setFocusedId] = useState<string | null>(null);
	const [excludedIds, setExcludedIds] = useState<string[]>([]);

	const allRows = useMemo(() => (data || []).slice(0, 25), [data]);
	const rows = allRows.filter(
		(row) =>
			(!focusedId || row.distinctId === focusedId) && !excludedIds.includes(row.distinctId),
	);
	const hasFilters = focusedId !== null || excludedIds.length > 0;
	const hasData = rows.length > 0;

	function toggleFocus(distinctId: string) {
		setFocusedId((current) => (current === distinctId ? null : distinctId));
	}

	function excludeVisitor(distinctId: string) {
		setExcludedIds((current) =>
			current.includes(distinctId) ? current : [...current, distinctId],
		);
		setFocusedId((current) => (current === distinctId ? null : current));
	}

	function clearFilters() {
		setFocusedId(null);
		setExcludedIds([]);
	}

	return (
		<div className={cn("bg-card border border-border rounded-sm", className)}>
			<div className="flex min-h-[33px] flex-wrap items-center gap-2 px-3 py-2 border-b border-border">
				<h3 className="text-xs font-medium text-foreground">Recent Events</h3>
				{focusedId && (
					<span
						className={cn(
							"inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px] leading-none",
							visitorColor(focusedId),
						)}
					>
						<span className="max-w-[120px] truncate">only {focusedId}</span>
						<button
							type="button"
							onClick={() => setFocusedId(null)}
							title="Clear visitor filter"
						>
							<X className="h-2.5 w-2.5" />
						</button>
					</span>
				)}
				{excludedIds.map((id) => (
					<span
						key={id}
						className="inline-flex items-center gap-1 rounded border border-border bg-muted/30 px-1.5 py-0.5 font-mono text-[10px] leading-none text-muted-foreground line-through"
					>
						<span className="max-w-[120px] truncate">{id}</span>
						<button
							type="button"
							onClick={() =>
								setExcludedIds((current) => current.filter((entry) => entry !== id))
							}
							title={`Stop excluding ${id}`}
						>
							<X className="h-2.5 w-2.5" />
						</button>
					</span>
				))}
				{hasFilters && (
					<button
						type="button"
						onClick={clearFilters}
						className="text-[10px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
					>
						clear
					</button>
				)}
			</div>
			{focusedId && (
				<VisitorDetailCard distinctId={focusedId} onClose={() => setFocusedId(null)} />
			)}
			{!hasData ? (
				isLoading ? (
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
								{Array.from({ length: 8 }).map((_, i) => (
									<tr key={i}>
										<td className="px-3 py-1.5">
											<Skeleton className="h-4 w-16 rounded" />
										</td>
										<td className="px-3 py-1.5">
											<Skeleton className="h-3 w-44" />
										</td>
										<td className="px-3 py-1.5">
											<Skeleton className="h-3 w-24" />
										</td>
										<td className="px-3 py-1.5">
											<Skeleton className="ml-auto h-3 w-10" />
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : (
					<div className="p-6 text-center">
						<Inbox className="h-6 w-6 text-muted-foreground/50 mx-auto mb-2" />
						<p className="text-[11px] text-muted-foreground">
							{hasFilters && allRows.length > 0 ? "No events match the current filters" : "No events yet"}
						</p>
						{hasFilters && allRows.length > 0 && (
							<button
								type="button"
								onClick={clearFilters}
								className="mt-1 text-[10px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
							>
								clear filters
							</button>
						)}
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
											{row.distinctId ? (
												<span className="group/visitor flex items-center gap-1">
													<VisitorBadge
														distinctId={row.distinctId}
														active={focusedId === row.distinctId}
														onToggle={() => toggleFocus(row.distinctId)}
													/>
													<span className="flex items-center gap-1 opacity-0 transition-opacity group-hover/visitor:opacity-100">
														<button
															type="button"
															onClick={() => excludeVisitor(row.distinctId)}
															title={`Exclude ${row.distinctId}`}
															className="text-muted-foreground hover:text-foreground"
														>
															<Ban className="h-3 w-3" />
														</button>
														{row.personUrl && (
															<a
																href={row.personUrl}
																target="_blank"
																rel="noreferrer"
																title={`Open ${row.distinctId} in PostHog`}
																className="text-muted-foreground hover:text-foreground"
															>
																<ExternalLink className="h-3 w-3" />
															</a>
														)}
													</span>
												</span>
											) : (
												<span className="text-muted-foreground">—</span>
											)}
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
