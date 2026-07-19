"use client";

import { cn } from "@/lib/utils";
import { Inbox } from "lucide-react";

type BreakdownItem = {
	label: string;
	value: number;
	percentage: number;
	color?: string;
};

const chartColors = [
	"var(--chart-1)",
	"var(--chart-2)",
	"var(--chart-3)",
	"var(--chart-4)",
	"var(--chart-5)",
];

type BreakdownChartProps = {
	data: BreakdownItem[];
	title?: string;
	showBar?: boolean;
	className?: string;
};

export function BreakdownChart({ data, title, showBar = true, className }: BreakdownChartProps) {
	const hasData = data && data.length > 0;

	return (
		<div className={cn("bg-card border border-border rounded-sm", className)}>
			{title && (
				<div className="px-3 py-2 border-b border-border">
					<h3 className="text-xs font-medium text-foreground">{title}</h3>
				</div>
			)}
			{!hasData ? (
				<div className="p-6 text-center">
					<Inbox className="h-6 w-6 text-muted-foreground/50 mx-auto mb-2" />
					<p className="text-xs text-muted-foreground">No data available</p>
				</div>
			) : (
				<div className="p-4 space-y-3">
					{data.map((item, i) => (
						<div key={item.label} className="space-y-1">
							<div className="flex items-center justify-between gap-4 text-xs">
								<span className="min-w-0 truncate font-medium text-foreground">{item.label}</span>
								<div className="flex shrink-0 items-center gap-3">
									<span className="text-muted-foreground tabular-nums">
										{item.value.toLocaleString()}
									</span>
									<span className="w-12 text-right font-medium text-foreground tabular-nums">
										{item.percentage.toFixed(1)}%
									</span>
								</div>
							</div>
							{showBar && (
								<div className="h-1.5 overflow-hidden rounded-full bg-muted">
									<div
										className="h-full rounded-full"
										style={{
											width: `${Math.min(100, item.percentage)}%`,
											backgroundColor: item.color || chartColors[i % chartColors.length],
										}}
									/>
								</div>
							)}
						</div>
					))}
				</div>
			)}
		</div>
	);
}

type DonutChartProps = {
	data: BreakdownItem[];
	title?: string;
	size?: number;
	className?: string;
};

export function DonutChart({ data, title, size = 80, className }: DonutChartProps) {
	const hasData = data && data.length > 0;
	const total = hasData ? data.reduce((sum, item) => sum + item.value, 0) : 0;
	const strokeWidth = 8;
	const radius = (size - strokeWidth) / 2;
	const circumference = 2 * Math.PI * radius;

	let cumulativePercentage = 0;

	return (
		<div className={cn("bg-card border border-border rounded-sm", className)}>
			{title && (
				<div className="px-3 py-2 border-b border-border">
					<h3 className="text-xs font-medium text-foreground">{title}</h3>
				</div>
			)}
			{!hasData ? (
				<div className="p-6 text-center">
					<Inbox className="h-6 w-6 text-muted-foreground/50 mx-auto mb-2" />
					<p className="text-xs text-muted-foreground">No data available</p>
				</div>
			) : (
				<div className="flex items-center gap-5 p-4">
					<svg width={size} height={size} className="transform -rotate-90 flex-shrink-0">
						{data.map((item, i) => {
							const percentage = (item.value / total) * 100;
							const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
							const strokeDashoffset = -(cumulativePercentage / 100) * circumference;
							cumulativePercentage += percentage;

							return (
								<circle
									key={item.label}
									cx={size / 2}
									cy={size / 2}
									r={radius}
									fill="none"
									stroke={item.color || chartColors[i % chartColors.length]}
									strokeWidth={strokeWidth}
									strokeDasharray={strokeDasharray}
									strokeDashoffset={strokeDashoffset}
									strokeLinecap="round"
								/>
							);
						})}
					</svg>
					<div className="flex-1 space-y-1">
						{data.map((item, i) => (
							<div key={item.label} className="flex items-center gap-2.5 text-xs">
								<span
									className="w-2 h-2 rounded-full flex-shrink-0"
									style={{ backgroundColor: item.color || chartColors[i % chartColors.length] }}
								/>
								<span className="min-w-0 flex-1 truncate font-medium text-foreground">
									{item.label}
								</span>
								<span className="w-10 text-right font-medium text-foreground tabular-nums">
									{item.percentage.toFixed(0)}%
								</span>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
