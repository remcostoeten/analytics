"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { KPIMetric } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

type KPICardProps = {
	metric: KPIMetric;
	compact?: boolean;
	isLoading?: boolean;
};

function KPICard({ metric, compact = false, isLoading = false }: KPICardProps) {
	if (isLoading) {
		return (
			<div
				className={cn(
					"bg-card border border-border px-3 py-2.5",
					compact ? "rounded" : "rounded-sm",
				)}
			>
				<Skeleton className="h-3 w-20 mb-2" />
				<Skeleton className="h-6 w-16" />
			</div>
		);
	}

	const { label, formattedValue, trend, sparkline } = metric;
	const trendValue = trend ? (trend.direction === "new" ? "New" : formatTrend(trend.value)) : null;
	const trendTone = trend ? getTrendTone(trend) : null;

	return (
		<div
			className={cn(
				"min-h-[68px] bg-card border border-border px-3 py-2.5",
				compact ? "rounded" : "rounded-sm",
			)}
		>
			<div className="flex h-full items-center justify-between gap-3">
				<div className="min-w-0 flex-1">
					<p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide truncate">
						{label}
					</p>
					<div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
						<span className="text-xl font-semibold text-foreground tabular-nums tracking-tight">
							{formattedValue}
						</span>
						{trend && trendValue && trendTone && (
							<span
								title={`${trend.direction} ${trendValue} vs previous period`}
								className={cn(
									"inline-flex max-w-full items-center gap-0.5 rounded-sm px-1.5 py-0.5 text-[10px] font-medium tabular-nums",
									trendTone,
								)}
							>
								{trend.direction === "up" && <TrendingUp className="h-3 w-3" />}
								{trend.direction === "down" && <TrendingDown className="h-3 w-3" />}
								{trend.direction === "flat" && <Minus className="h-3 w-3" />}
								{trend.direction === "up" ? "+" : trend.direction === "down" ? "-" : ""}
								{trendValue}
							</span>
						)}
					</div>
				</div>
				{sparkline && sparkline.length > 0 && (
					<div className="h-8 w-16 flex-shrink-0">
						<Sparkline data={sparkline} />
					</div>
				)}
			</div>
		</div>
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
	const height = 32;
	const width = 64;
	const padding = 2;

	const points = data
		.map((value, i) => {
			const x = (i / (data.length - 1)) * (width - padding * 2) + padding;
			const y = height - padding - ((value - min) / range) * (height - padding * 2);
			return `${x},${y}`;
		})
		.join(" ");

	return (
		<svg
			viewBox={`0 0 ${width} ${height}`}
			className={cn("w-full h-full", className)}
			preserveAspectRatio="none"
		>
			<polyline
				points={points}
				fill="none"
				stroke="currentColor"
				strokeWidth="1.5"
				className="text-muted-foreground/50"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

type KPICardsGridProps = {
	kpis: KPIMetric[];
	className?: string;
	isLoading?: boolean;
};

export function KPICardsGrid({ kpis, className, isLoading }: KPICardsGridProps) {
	return (
		<div className={cn("grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2", className)}>
			{kpis.map((metric) => (
				<KPICard key={metric.id} metric={metric} isLoading={isLoading} />
			))}
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
	if (!trend || trend.direction === "flat") return "bg-muted text-muted-foreground";
	if (trend.isPositive) return "bg-emerald-500/10 text-emerald-500";
	return "bg-red-500/10 text-red-400";
}

export { KPICard, Sparkline };
