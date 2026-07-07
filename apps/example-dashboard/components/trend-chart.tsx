"use client";

import {
	AreaChart,
	Area,
	XAxis,
	YAxis,
	Tooltip,
	ResponsiveContainer,
	CartesianGrid,
	ReferenceLine,
} from "recharts";
import { Inbox } from "lucide-react";
import type { TimeSeries } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

type TrendChartProps = {
	data: TimeSeries;
	title?: string;
	color?: string;
	height?: number;
	showAxis?: boolean;
	className?: string;
	isLoading?: boolean;
};

export function TrendChart({
	data,
	title,
	color = "var(--chart-1)",
	height = 120,
	showAxis = true,
	className,
	isLoading = false,
}: TrendChartProps) {
	const hasData = data && data.data && data.data.length > 0;
	const formatLabel = (timestamp: Date | string) => {
		const date = new Date(timestamp);
		if (data.granularity === "day") {
			return date.toLocaleDateString([], { month: "short", day: "numeric" });
		}
		return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
	};
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

	return (
		<div className={cn("bg-card border border-border rounded-sm", className)}>
			{title && (
				<div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
					<h3 className="text-xs font-medium text-foreground">{title}</h3>
					{hasData && (
						<div className="flex shrink-0 items-center gap-3 text-[10px] text-muted-foreground">
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
						<p className="text-[11px] text-muted-foreground">No data available</p>
					</div>
				)
			) : isSparse && singlePoint ? (
				<div className="px-5 py-4" style={{ height }}>
					<div className="flex h-full flex-col justify-between rounded-sm border border-border/60 bg-muted/20 px-4 py-3">
						<div className="flex items-center justify-between gap-4">
							<div>
								<p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
									Latest Sample
								</p>
								<p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
									{Number(singlePoint.value).toLocaleString()}
								</p>
							</div>
							<div className="text-right">
								<p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
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
					<ResponsiveContainer width="100%" height="100%">
						<AreaChart data={chartData} margin={{ top: 10, right: 14, left: 0, bottom: 0 }}>
							<defs>
								<linearGradient id={`gradient-${data.id}`} x1="0" y1="0" x2="0" y2="1">
									<stop offset="0%" stopColor={color} stopOpacity={0.5} />
									<stop offset="100%" stopColor={color} stopOpacity={0.1} />
								</linearGradient>
							</defs>
							<CartesianGrid
								strokeDasharray="3 3"
								vertical={false}
								stroke="var(--border)"
								strokeOpacity={0.5}
							/>
							{showAxis && (
								<>
									<XAxis
										dataKey="formattedTime"
										axisLine={false}
										tickLine={false}
										tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
										interval="preserveStartEnd"
										minTickGap={40}
									/>
									<YAxis
										axisLine={false}
										domain={[0, (max: number) => Math.max(1, Math.ceil(max * 1.2))]}
										tickLine={false}
										tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
										width={32}
										tickFormatter={(v) => formatCompact(v)}
									/>
								</>
							)}
							<Tooltip
								content={({ active, payload }) => {
									if (!active || !payload?.length) return null;
									const p = payload[0].payload;
									return (
										<div className="bg-background border border-border rounded px-2.5 py-1.5 shadow-lg">
											<p className="text-[10px] text-muted-foreground">{p.formattedTime}</p>
											<p className="text-sm font-semibold text-foreground">
												{Number(p.value).toLocaleString()}
											</p>
										</div>
									);
								}}
							/>
							<ReferenceLine y={0} stroke="var(--border)" strokeOpacity={0.5} />
							<Area
								type="monotone"
								dataKey="value"
								stroke={color}
								strokeWidth={3}
								fill={`url(#gradient-${data.id})`}
								dot={{
									r: 3,
									fill: "var(--background)",
									stroke: color,
									strokeWidth: 2,
								}}
								activeDot={{
									r: 4.5,
									fill: "var(--background)",
									stroke: color,
									strokeWidth: 2,
								}}
							/>
						</AreaChart>
					</ResponsiveContainer>
				</div>
			)}
		</div>
	);
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
