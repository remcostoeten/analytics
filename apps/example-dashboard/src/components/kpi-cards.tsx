"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { KPIMetric } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const PRIMARY_COUNT = 4;

type KPICardProps = {
	metric: KPIMetric;
	isLoading?: boolean;
};

function KPICard({ metric, isLoading = false }: KPICardProps) {
	if (isLoading) {
		return (
			<div className="h-[88px] rounded-lg border border-border bg-card px-4 py-3">
				<Skeleton className="h-3 w-20" />
				<Skeleton className="mt-3 h-7 w-24" />
			</div>
		);
	}

	const { label, formattedValue, sparkline } = metric;

	return (
		<div className="group relative h-[88px] overflow-hidden rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:border-foreground/20">
			<div className="flex h-full items-start justify-between gap-3">
				<div className="flex min-w-0 flex-col justify-between self-stretch">
					<p className="truncate text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
						{label}
					</p>
					<div className="flex min-w-0 items-baseline gap-2">
						<span className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
							{formattedValue}
						</span>
						<TrendBadge trend={metric.trend} />
					</div>
				</div>
				{sparkline && sparkline.length > 1 && (
					<div className="h-10 w-24 shrink-0 self-end text-primary">
						<Sparkline data={sparkline} />
					</div>
				)}
			</div>
		</div>
	);
}

type TrendBadgeProps = {
	trend: KPIMetric["trend"];
	inline?: boolean;
};

function TrendBadge({ trend, inline = false }: TrendBadgeProps) {
	if (!trend) return null;

	const value = trend.direction === "new" ? "New" : formatTrend(trend.value);
	const sign = trend.direction === "up" ? "+" : trend.direction === "down" ? "-" : "";
	const Icon =
		trend.direction === "up" ? TrendingUp : trend.direction === "down" ? TrendingDown : Minus;

	return (
		<span
			title={`${sign}${value} vs previous period`}
			className={cn(
				"inline-flex shrink-0 items-center gap-0.5 text-[11px] font-medium tabular-nums",
				inline ? "" : "rounded-md px-1.5 py-0.5",
				getTrendTone(trend, inline),
			)}
		>
			<Icon className="h-3 w-3" />
			{sign}
			{value}
		</span>
	);
}

type SparklineProps = {
	data: number[];
	className?: string;
};

function Sparkline({ data, className }: SparklineProps) {
	if (!data.length) return null;

	const min = Math.min(...data);
	const max = Math.max(...data);
	const range = max - min || 1;
	const height = 40;
	const width = 96;
	const padding = 2;

	const coords = data.map((value, i) => {
		const x = (i / (data.length - 1)) * (width - padding * 2) + padding;
		const y = height - padding - ((value - min) / range) * (height - padding * 2);
		return [x, y] as const;
	});
	const line = coords.map(([x, y]) => `${x},${y}`).join(" ");
	const area = `${coords[0][0]},${height} ${line} ${coords[coords.length - 1][0]},${height}`;
	const gradientId = `spark-${data.length}-${Math.round(max)}`;

	return (
		<svg
			viewBox={`0 0 ${width} ${height}`}
			className={cn("h-full w-full", className)}
			preserveAspectRatio="none"
			aria-hidden
		>
			<defs>
				<linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
					<stop offset="100%" stopColor="currentColor" stopOpacity="0" />
				</linearGradient>
			</defs>
			<polygon points={area} fill={`url(#${gradientId})`} />
			<polyline
				points={line}
				fill="none"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>
		</svg>
	);
}

type SecondaryStripProps = {
	metrics: KPIMetric[];
	isLoading?: boolean;
};

function SecondaryStrip({ metrics, isLoading }: SecondaryStripProps) {
	if (metrics.length === 0) return null;

	return (
		<div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-border/70 bg-card/60 px-4 py-2">
			{metrics.map((metric) => (
				<div key={metric.id} className="flex items-baseline gap-2">
					<span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
						{metric.label}
					</span>
					{isLoading ? (
						<Skeleton className="h-4 w-10" />
					) : (
						<>
							<span className="text-sm font-semibold tabular-nums text-foreground">
								{metric.formattedValue}
							</span>
							<TrendBadge trend={metric.trend} inline />
						</>
					)}
				</div>
			))}
		</div>
	);
}

type KPICardsGridProps = {
	kpis: KPIMetric[];
	className?: string;
	isLoading?: boolean;
};

export function KPICardsGrid({ kpis, className, isLoading }: KPICardsGridProps) {
	const primary = kpis.slice(0, PRIMARY_COUNT);
	const secondary = kpis.slice(PRIMARY_COUNT);

	return (
		<div className={cn("space-y-2", className)}>
			<div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
				{primary.map((metric) => (
					<KPICard key={metric.id} metric={metric} isLoading={isLoading} />
				))}
			</div>
			<SecondaryStrip metrics={secondary} isLoading={isLoading} />
		</div>
	);
}

function formatTrend(value: number): string {
	const abs = Math.abs(value);
	if (abs >= 1000) return `${(abs / 1000).toFixed(1)}K%`;

	const rounded = abs >= 100 ? Math.round(abs) : Number(abs.toFixed(1));

	return `${rounded}%`;
}

function getTrendTone(trend: KPIMetric["trend"], inline: boolean): string {
	if (!trend || trend.direction === "flat") {
		return inline ? "text-muted-foreground" : "bg-muted text-muted-foreground";
	}
	if (trend.isPositive) return inline ? "text-emerald-500" : "bg-emerald-500/10 text-emerald-500";
	return inline ? "text-red-400" : "bg-red-500/10 text-red-400";
}

export { KPICard, Sparkline };
