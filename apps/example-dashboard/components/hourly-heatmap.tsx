"use client";

import { cn } from "@/lib/utils";
import { Inbox } from "lucide-react";
import { useMemo, useState } from "react";

type HourlyHeatmapData = {
	data: number[][];
	maxCount: number;
	days: string[];
};

type HourlyHeatmapProps = {
	data: HourlyHeatmapData | null;
	className?: string;
};

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

	function getIntensity(count: number): number {
		if (count === 0) return 0;
		return Math.max(0.22, count / data.maxCount);
	}

	function getCellColor(count: number): string {
		if (count === 0) return "hsl(var(--muted) / 0.24)";
		const intensity = getIntensity(count);
		return `hsl(var(--foreground) / ${0.16 + intensity * 0.5})`;
	}

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

				<div className="space-y-0.5">
					{data.days.map((day, dayIndex) => (
						<div key={day} className="flex items-center gap-1">
							<div className="w-7 shrink-0 text-[9px] text-muted-foreground text-right">{day}</div>
							<div className="flex-1 flex gap-px">
								{hours.map((_, hourIndex) => {
									const count = data.data[dayIndex][hourIndex];
									const isHovered =
										hoveredCell?.day === dayIndex && hoveredCell?.hour === hourIndex;

									return (
										<div
											key={hourIndex}
											className={cn(
												"flex-1 aspect-square rounded-[3px] border border-border/40 transition-all cursor-crosshair",
												isHovered &&
													"scale-[1.06] border-foreground/60 shadow-[0_0_0_1px_hsl(var(--background)),0_0_18px_hsl(var(--foreground)/0.08)]",
											)}
											style={{
												backgroundColor: getCellColor(count),
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

				<div className="flex items-center justify-end gap-2 mt-3">
					<span className="text-[9px] text-muted-foreground">Less</span>
					<div className="flex gap-px">
						{[0, 0.25, 0.5, 0.75, 1].map((intensity, i) => (
							<div
								key={i}
								className="h-3 w-3 rounded-[2px] border border-border/40"
								style={{
									backgroundColor:
										intensity === 0
											? "hsl(var(--muted) / 0.24)"
											: `hsl(var(--foreground) / ${0.16 + intensity * 0.5})`,
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
