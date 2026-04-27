"use client";

import { useMemo } from "react";
import {
	AreaChart,
	Area,
	XAxis,
	YAxis,
	Tooltip,
	ResponsiveContainer,
	CartesianGrid,
} from "recharts";
import { Inbox } from "lucide-react";
import type { TimeSeries } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TrendChartProps {
	data: TimeSeries;
	title?: string;
	color?: string;
	height?: number;
	showAxis?: boolean;
	className?: string;
}

export function TrendChart({
	data,
	title,
	color = "hsl(var(--chart-1))",
	height = 120,
	showAxis = true,
	className,
}: TrendChartProps) {
	const hasData = data && data.data && data.data.length > 0;

	const chartData = useMemo(() => {
		if (!hasData) return [];
		return data.data.map((point) => ({
			timestamp: point.timestamp,
			value: point.value,
			formattedTime: new Date(point.timestamp).toLocaleTimeString([], {
				hour: "2-digit",
				minute: "2-digit",
			}),
		}));
	}, [data, hasData]);

	return (
		<div className={cn("bg-card border border-border rounded-sm", className)}>
			{title && (
				<div className="px-3 py-2 border-b border-border">
					<h3 className="text-xs font-medium text-foreground">{title}</h3>
				</div>
			)}
			{!hasData ? (
				<div className="p-8 text-center" style={{ height }}>
					<Inbox className="h-6 w-6 text-muted-foreground/50 mx-auto mb-2" />
					<p className="text-[11px] text-muted-foreground">No data available</p>
				</div>
			) : (
				<div className="p-2" style={{ height }}>
					<ResponsiveContainer width="100%" height="100%">
						<AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
							<defs>
								<linearGradient id={`gradient-${data.id}`} x1="0" y1="0" x2="0" y2="1">
									<stop offset="0%" stopColor={color} stopOpacity={0.35} />
									<stop offset="100%" stopColor={color} stopOpacity={0.05} />
								</linearGradient>
							</defs>
							<CartesianGrid
								strokeDasharray="3 3"
								vertical={false}
								stroke="hsl(var(--border))"
								strokeOpacity={0.5}
							/>
							{showAxis && (
								<>
									<XAxis
										dataKey="formattedTime"
										axisLine={false}
										tickLine={false}
										tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
										interval="preserveStartEnd"
										minTickGap={40}
									/>
									<YAxis
										axisLine={false}
										tickLine={false}
										tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
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
							<Area
								type="monotone"
								dataKey="value"
								stroke={color}
								strokeWidth={2}
								fill={`url(#gradient-${data.id})`}
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
	return value.toString();
}

// Mini sparkline chart for inline use
interface SparklineChartProps {
	data: number[];
	color?: string;
	width?: number;
	height?: number;
	className?: string;
}

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
