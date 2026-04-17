"use client";

import { cn } from "@/lib/utils";
import { Clock, Layers, ArrowLeftRight, Users } from "lucide-react";

interface SessionStatsData {
	avgPageviews: number;
	avgDuration: number;
	avgUniquePages: number;
	totalSessions: number;
	bounceRate: number;
}

interface SessionStatsCardProps {
	data: SessionStatsData | null;
	className?: string;
}

function formatDuration(seconds: number): string {
	if (seconds < 60) return `${seconds}s`;
	const mins = Math.floor(seconds / 60);
	const secs = seconds % 60;
	if (mins < 60) return `${mins}m ${secs}s`;
	const hours = Math.floor(mins / 60);
	const remainingMins = mins % 60;
	return `${hours}h ${remainingMins}m`;
}

export function SessionStatsCard({ data, className }: SessionStatsCardProps) {
	if (!data) {
		return (
			<div className={cn("bg-card border border-border rounded-sm p-3", className)}>
				<p className="text-[11px] text-muted-foreground text-center">Loading session stats...</p>
			</div>
		);
	}

	const stats = [
		{
			label: "Avg. Duration",
			value: formatDuration(data.avgDuration),
			icon: Clock,
			color: "text-chart-1",
		},
		{
			label: "Pages / Session",
			value: data.avgPageviews.toFixed(1),
			icon: Layers,
			color: "text-chart-2",
		},
		{
			label: "Bounce Rate",
			value: `${data.bounceRate}%`,
			icon: ArrowLeftRight,
			color:
				data.bounceRate > 70
					? "text-red-500"
					: data.bounceRate > 50
						? "text-amber-500"
						: "text-emerald-500",
		},
		{
			label: "Sessions",
			value: data.totalSessions.toLocaleString(),
			icon: Users,
			color: "text-chart-4",
		},
	];

	return (
		<div className={cn("bg-card border border-border rounded-sm", className)}>
			<div className="px-3 py-2 border-b border-border">
				<h3 className="text-xs font-medium text-foreground">Session Analytics</h3>
			</div>
			<div className="grid grid-cols-2 gap-px bg-border">
				{stats.map((stat) => (
					<div key={stat.label} className="bg-card p-3">
						<div className="flex items-center gap-1.5 mb-1">
							<stat.icon className={cn("h-3 w-3", stat.color)} />
							<span className="text-[10px] text-muted-foreground uppercase tracking-wide">
								{stat.label}
							</span>
						</div>
						<p className="text-lg font-semibold text-foreground tabular-nums">{stat.value}</p>
					</div>
				))}
			</div>
		</div>
	);
}
