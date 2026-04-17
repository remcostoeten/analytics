"use client";

import { cn } from "@/lib/utils";
import { Inbox } from "lucide-react";
import { useMemo, useState } from "react";

interface HourlyHeatmapData {
	data: number[][];
	maxCount: number;
	days: string[];
}

interface HourlyHeatmapProps {
	data: HourlyHeatmapData | null;
	className?: string;
}

export function HourlyHeatmap({ data, className }: HourlyHeatmapProps) {
	const [hoveredCell, setHoveredCell] = useState<{ day: number; hour: number } | null>(null);

	const hours = useMemo(
		() => Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0")),
		[],
	);

	if (!data || data.maxCount === 0) {
		return (
			<div className={cn("bg-card border border-border rounded-sm", className)}>
				<div className="px-3 py-2 border-b border-border">
					<h3 className="text-xs font-medium text-foreground">Traffic by Hour</h3>
				</div>
				<div className="p-6 text-center">
					<Inbox className="h-6 w-6 text-muted-foreground/50 mx-auto mb-2" />
					<p className="text-[11px] text-muted-foreground">No traffic data available</p>
				</div>
			</div>
		);
	}

	const getIntensity = (count: number) => {
		if (count === 0) return 0;
		return Math.max(0.1, count / data.maxCount);
	};

	const hoveredInfo = hoveredCell
		? {
				day: data.days[hoveredCell.day],
				hour: hours[hoveredCell.hour],
				count: data.data[hoveredCell.day][hoveredCell.hour],
			}
		: null;

	return (
		<div className={cn("bg-card border border-border rounded-sm", className)}>
			<div className="px-3 py-2 border-b border-border flex items-center justify-between">
				<h3 className="text-xs font-medium text-foreground">Traffic by Hour</h3>
				{hoveredInfo && (
					<span className="text-[10px] text-muted-foreground">
						{hoveredInfo.day} {hoveredInfo.hour}:00 - {hoveredInfo.count.toLocaleString()} views
					</span>
				)}
			</div>
			<div className="p-3">
				{/* Hour labels */}
				<div className="flex mb-1">
					<div className="w-8 shrink-0" />
					<div className="flex-1 flex">
						{hours.map((h, i) => (
							<div
								key={h}
								className="flex-1 text-center text-[8px] text-muted-foreground"
								style={{ minWidth: 0 }}
							>
								{i % 3 === 0 ? h : ""}
							</div>
						))}
					</div>
				</div>

				{/* Heatmap grid */}
				<div className="space-y-0.5">
					{data.days.map((day, dayIndex) => (
						<div key={day} className="flex items-center gap-1">
							<div className="w-7 shrink-0 text-[9px] text-muted-foreground text-right">{day}</div>
							<div className="flex-1 flex gap-px">
								{hours.map((_, hourIndex) => {
									const count = data.data[dayIndex][hourIndex];
									const intensity = getIntensity(count);
									const isHovered =
										hoveredCell?.day === dayIndex && hoveredCell?.hour === hourIndex;

									return (
										<div
											key={hourIndex}
											className={cn(
												"flex-1 aspect-square rounded-[2px] transition-all cursor-crosshair",
												isHovered && "ring-1 ring-primary ring-offset-1 ring-offset-background",
											)}
											style={{
												backgroundColor:
													count === 0 ? "hsl(var(--muted))" : `hsl(var(--chart-1) / ${intensity})`,
												minWidth: 0,
											}}
											onMouseEnter={() => setHoveredCell({ day: dayIndex, hour: hourIndex })}
											onMouseLeave={() => setHoveredCell(null)}
										/>
									);
								})}
							</div>
						</div>
					))}
				</div>

				{/* Legend */}
				<div className="flex items-center justify-end gap-2 mt-3">
					<span className="text-[9px] text-muted-foreground">Less</span>
					<div className="flex gap-px">
						{[0, 0.25, 0.5, 0.75, 1].map((intensity, i) => (
							<div
								key={i}
								className="w-3 h-3 rounded-[2px]"
								style={{
									backgroundColor:
										intensity === 0 ? "hsl(var(--muted))" : `hsl(var(--chart-1) / ${intensity})`,
								}}
							/>
						))}
					</div>
					<span className="text-[9px] text-muted-foreground">More</span>
				</div>
			</div>
		</div>
	);
}
