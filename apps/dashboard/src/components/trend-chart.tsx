"use client";

import { useId, type CSSProperties } from "react";
import { Area, Bar, ComposedChart, XAxis, YAxis, CartesianGrid, ReferenceLine } from "recharts";
import { Inbox, TrendingDownIcon, TrendingUpIcon } from "lucide-react";
import type { TimeSeries } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig,
} from "@/components/ui/chart";

type TrendChartProps = {
	data: TimeSeries;
	title?: string;
	color?: string;
	height?: number;
	showAxis?: boolean;
	chartType?: "area" | "bar";
	className?: string;
	isLoading?: boolean;
};

export function TrendChart({
	data,
	title,
	color = "var(--chart-1)",
	height = 120,
	showAxis = true,
	chartType = "area",
	className,
	isLoading = false,
}: TrendChartProps) {
	const chartId = useId().replace(/:/g, "");
	const hasData = data && data.data && data.data.length > 0;
	function formatLabel(timestamp: Date | string) {
		const date = new Date(timestamp);
		if (data.granularity === "day") {
			return date.toLocaleDateString([], { month: "short", day: "numeric" });
		}
		return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
	}
	const chartData = hasData
		? data.data.map((point) => ({
				timestamp: point.timestamp,
				value: point.value,
				formattedTime: formatLabel(point.timestamp),
			}))
		: [];
	const isSparse = chartData.length === 1;
	const singlePoint = isSparse ? chartData[0] : null;
	const values = chartData.map((point) => Number(point.value) || 0);
	const total = values.reduce((sum, value) => sum + value, 0);
	const peak = values.length ? Math.max(...values) : 0;
	const average = values.length ? total / values.length : 0;
	const change = percentChange(values);
	const gradientId = `${chartId}-gradient`;
	const chartConfig = {
		value: {
			label: data?.label || title || "Value",
			color,
		},
	} satisfies ChartConfig;

	return (
		<div className={cn("rounded-lg border border-border bg-card", className)}>
			{title && (
				<div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
					<h3 className="flex items-center gap-2 text-xs font-medium text-foreground">
						{title}
						{hasData && change !== null && (
							<Badge
								variant="outline"
								className={cn(
									"tabular-nums",
									change >= 0
										? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
										: "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400",
								)}
							>
								{change >= 0 ? (
									<TrendingUpIcon aria-hidden="true" />
								) : (
									<TrendingDownIcon aria-hidden="true" />
								)}
								{change >= 0 ? "+" : ""}
								{change.toFixed(1)}%
							</Badge>
						)}
					</h3>
					{hasData && (
						<div className="flex shrink-0 items-center gap-3 text-[11px] text-muted-foreground">
							<span className="tabular-nums">total {formatCompact(total)}</span>
							<span className="tabular-nums">peak {formatCompact(peak)}</span>
							<span className="tabular-nums">avg {formatCompact(average)}</span>
						</div>
					)}
				</div>
			)}
			{!hasData ? (
				isLoading ? (
					<div className="p-3" style={{ height }}>
						<Skeleton className="h-full w-full" />
					</div>
				) : (
					<div className="p-8 text-center" style={{ height }}>
						<Inbox className="h-6 w-6 text-muted-foreground/50 mx-auto mb-2" />
						<p className="text-xs text-muted-foreground">No data available</p>
					</div>
				)
			) : isSparse && singlePoint ? (
				<div className="px-5 py-4" style={{ height }}>
					<div className="flex h-full flex-col justify-between rounded-sm border border-border/60 bg-muted/20 px-4 py-3">
						<div className="flex items-center justify-between gap-4">
							<div>
								<p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
									Latest Sample
								</p>
								<p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
									{Number(singlePoint.value).toLocaleString()}
								</p>
							</div>
							<div className="text-right">
								<p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
									Time
								</p>
								<p className="mt-1 text-sm font-medium text-foreground/80">
									{singlePoint.formattedTime}
								</p>
							</div>
						</div>
						<div className="relative mt-4 h-10">
							<div className="absolute inset-x-0 top-1/2 border-t border-border/60" />
							<div
								className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-background shadow-[0_0_0_4px_hsl(var(--background)),0_0_24px_hsl(var(--foreground)/0.12)]"
								style={{ left: "calc(50% - 0.375rem)", backgroundColor: color }}
							/>
						</div>
					</div>
				</div>
			) : (
				<div aria-label={title || data.label} className="p-2" style={{ height }}>
					<ChartContainer
						config={chartConfig}
						className="aspect-auto h-full w-full"
						style={{ ["--color-value" as string]: color } as CSSProperties}
					>
						<ComposedChart data={chartData} margin={{ top: 10, right: 14, left: 4, bottom: 4 }}>
							<defs>
								<linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
									<stop offset="5%" stopColor={color} stopOpacity={0.5} />
									<stop offset="95%" stopColor={color} stopOpacity={0.05} />
								</linearGradient>
							</defs>
							<CartesianGrid vertical={false} strokeDasharray="3 3" />
							{showAxis && (
								<>
									<XAxis
										dataKey="formattedTime"
										axisLine={false}
										tickLine={false}
										tickMargin={8}
										tick={{ fontSize: 10 }}
										interval="preserveStartEnd"
										minTickGap={40}
										height={28}
									/>
									<YAxis
										axisLine={false}
										domain={[0, (max: number) => Math.max(1, Math.ceil(max * 1.2))]}
										tickLine={false}
										tick={{ fontSize: 10 }}
										width={38}
										tickFormatter={(v) => formatCompact(v)}
									/>
								</>
							)}
							<ChartTooltip
								cursor={false}
								content={
									<ChartTooltipContent
										indicator="dot"
										className="min-w-40 gap-2.5"
										labelFormatter={(value) => (
											<div className="border-border/50 mb-0.5 border-b pb-2">
												<span className="text-xs font-medium">{value}</span>
											</div>
										)}
										formatter={(value, name) => (
											<div className="flex w-full items-center justify-between gap-2">
												<div className="flex items-center gap-1.5">
													<div
														className="h-2.5 w-2.5 shrink-0 rounded-xs bg-(--color-bg)"
														style={{ ["--color-bg" as string]: color } as CSSProperties}
													/>
													<span className="text-muted-foreground">
														{chartConfig[name as keyof typeof chartConfig]?.label || name}
													</span>
												</div>
												<span className="text-foreground font-semibold tabular-nums">
													{Number(value).toLocaleString()}
												</span>
											</div>
										)}
									/>
								}
							/>
							<ReferenceLine y={0} stroke="var(--border)" strokeOpacity={0.5} />
							{chartType === "bar" ? (
								<Bar dataKey="value" fill={color} maxBarSize={32} radius={[3, 3, 0, 0]} />
							) : (
								<Area
									dataKey="value"
									type="natural"
									fill={`url(#${gradientId})`}
									stroke={color}
									strokeWidth={2}
								/>
							)}
						</ComposedChart>
					</ChartContainer>
				</div>
			)}
		</div>
	);
}

function percentChange(values: number[]): number | null {
	if (values.length < 2) return null;
	const first = values[0];
	const last = values[values.length - 1];
	if (!first) return null;
	return ((last - first) / first) * 100;
}

function formatCompact(value: number): string {
	if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
	if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
	if (value % 1 !== 0) return value.toFixed(1);
	return value.toString();
}

type SparklineChartProps = {
	data: number[];
	color?: string;
	width?: number;
	height?: number;
	className?: string;
};

export function SparklineChart({
	data,
	color = "currentColor",
	width = 60,
	height = 20,
	className,
}: SparklineChartProps) {
	if (!data.length) return null;

	const min = Math.min(...data);
	const max = Math.max(...data);
	const range = max - min || 1;
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
			className={cn("flex-shrink-0", className)}
			style={{ width, height }}
		>
			<polyline
				points={points}
				fill="none"
				stroke={color}
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}
