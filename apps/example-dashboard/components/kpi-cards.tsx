"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { KPIMetric } from "@/lib/types";
import { cn } from "@/lib/utils";

interface KPICardProps {
	metric: KPIMetric;
	compact?: boolean;
}

function KPICard({ metric, compact = false }: KPICardProps) {
	const { label, formattedValue, trend, sparkline } = metric;

	return (
		<div
			className={cn("bg-card border border-border px-3 py-2.5", compact ? "rounded" : "rounded-sm")}
		>
			<div className="flex items-center justify-between gap-3">
				<div className="min-w-0 flex-1">
					<p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide truncate">
						{label}
					</p>
					<div className="flex items-baseline gap-2 mt-0.5">
						<span className="text-xl font-semibold text-foreground tabular-nums">
							{formattedValue}
						</span>
						{trend && (
							<span
								className={cn(
									"flex items-center gap-0.5 text-[11px] font-medium",
									trend.isPositive
										? trend.direction === "up"
											? "text-emerald-600 dark:text-emerald-400"
											: trend.direction === "down"
												? "text-emerald-600 dark:text-emerald-400"
												: "text-muted-foreground"
										: trend.direction === "up"
											? "text-red-600 dark:text-red-400"
											: trend.direction === "down"
												? "text-red-600 dark:text-red-400"
												: "text-muted-foreground",
								)}
							>
								{trend.direction === "up" && <TrendingUp className="h-3 w-3" />}
								{trend.direction === "down" && <TrendingDown className="h-3 w-3" />}
								{trend.direction === "flat" && <Minus className="h-3 w-3" />}
								{trend.direction === "up" ? "+" : trend.direction === "down" ? "-" : ""}
								{Math.abs(trend.value)}%
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

interface SparklineProps {
	data: number[];
	className?: string;
}

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

interface KPICardsGridProps {
	kpis: KPIMetric[];
	className?: string;
}

export function KPICardsGrid({ kpis, className }: KPICardsGridProps) {
	return (
		<div className={cn("grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-2", className)}>
			{kpis.map((metric) => (
				<KPICard key={metric.id} metric={metric} />
			))}
		</div>
	);
}

export { KPICard, Sparkline };
