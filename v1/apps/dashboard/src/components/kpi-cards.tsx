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
			<div className="bg-card px-4 py-3.5">
				<Skeleton className="h-2.5 w-16" />
				<Skeleton className="mt-3 h-6 w-20" />
			</div>
		);
	}

	const { label, formattedValue, sparkline } = metric;

	return (
		<div className="group relative overflow-hidden bg-card px-4 py-3.5 transition-colors hover:bg-muted/30">
			{sparkline && sparkline.length > 1 && (
				<div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 text-primary opacity-40 transition-opacity group-hover:opacity-70">
					<Sparkline data={sparkline} />
				</div>
			)}
			<div className="relative">
				<p className="truncate text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
					{label}
				</p>
				<div className="mt-1.5 flex min-w-0 items-baseline gap-2">
					<span className="text-[22px] font-semibold leading-none tabular-nums tracking-tight text-foreground">
						{formattedValue}
					</span>
					<TrendBadge trend={metric.trend} />
				</div>
			</div>
		</div>
	);
}

type TrendBadgeProps = {
	trend: KPIMetric["trend"];
};

function TrendBadge({ trend }: TrendBadgeProps) {
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
				getTrendTone(trend),
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
		<>
			{metrics.map((metric) => (
				<div
					key={metric.id}
					className="flex items-baseline justify-between gap-3 bg-card px-4 py-2.5 transition-colors hover:bg-muted/30"
				>
					<span className="truncate text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
						{metric.label}
					</span>
					{isLoading ? (
						<Skeleton className="h-3.5 w-10" />
					) : (
						<span className="flex shrink-0 items-baseline gap-2">
							<span className="text-sm font-semibold tabular-nums text-foreground">
								{metric.formattedValue}
							</span>
							<TrendBadge trend={metric.trend} />
						</span>
					)}
				</div>
			))}
		</>
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
		<div
			className={cn(
				"grid gap-px overflow-hidden rounded-lg border border-border bg-border",
				className,
			)}
		>
			<div className="grid grid-cols-2 gap-px xl:grid-cols-4">
				{primary.map((metric) => (
					<KPICard key={metric.id} metric={metric} isLoading={isLoading} />
				))}
			</div>
			{secondary.length > 0 && (
				<div className="grid grid-cols-1 gap-px sm:grid-cols-3">
					<SecondaryStrip metrics={secondary} isLoading={isLoading} />
				</div>
			)}
		</div>
	);
}

function formatTrend(value: number): string {
	const abs = Math.abs(value);
	if (abs >= 1000) return `${(abs / 1000).toFixed(1)}K%`;

	const rounded = abs >= 100 ? Math.round(abs) : Number(abs.toFixed(1));

	return `${rounded}%`;
}

function getTrendTone(trend: KPIMetric["trend"]): string {
	if (!trend || trend.direction === "flat") return "text-muted-foreground";
	if (trend.isPositive) return "text-emerald-500/90";
	return "text-red-400/90";
}

export { KPICard, Sparkline };
