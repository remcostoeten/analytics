"use client";

import { cn } from "@/lib/utils";
import { Bot, ShieldAlert } from "lucide-react";

interface BotBreakdown {
	total: number;
	uniqueVisitors: number;
	topPages: { path: string; hits: number }[];
}

interface BotTrafficCardProps {
	data: BotBreakdown | null;
	totalEvents?: number;
	className?: string;
}

export function BotTrafficCard({ data, totalEvents, className }: BotTrafficCardProps) {
	if (!data) return null;

	const botRate =
		totalEvents && totalEvents > 0
			? ((data.total / totalEvents) * 100).toFixed(1)
			: null;

	const maxHits = Math.max(...(data.topPages?.map((p) => p.hits) || [1]), 1);

	return (
		<div className={cn("bg-card border border-border rounded-sm", className)}>
			<div className="px-3 py-2 border-b border-border flex items-center justify-between">
				<div className="flex items-center gap-1.5">
					<Bot className="h-3.5 w-3.5 text-muted-foreground" />
					<h3 className="text-xs font-medium text-foreground">Bot Traffic</h3>
				</div>
				{botRate && (
					<span className="text-[10px] text-amber-500 font-medium">{botRate}% of total</span>
				)}
			</div>

			<div className="flex border-b border-border/60 divide-x divide-border/60">
				<div className="flex-1 px-3 py-2.5 text-center">
					<p className="text-sm font-semibold text-foreground tabular-nums">
						{data.total.toLocaleString()}
					</p>
					<p className="text-[9px] uppercase tracking-wide text-muted-foreground mt-0.5">
						Bot Events
					</p>
				</div>
				<div className="flex-1 px-3 py-2.5 text-center">
					<p className="text-sm font-semibold text-foreground tabular-nums">
						{data.uniqueVisitors.toLocaleString()}
					</p>
					<p className="text-[9px] uppercase tracking-wide text-muted-foreground mt-0.5">
						Unique Bots
					</p>
				</div>
			</div>

			{data.topPages.length > 0 ? (
				<div className="divide-y divide-border/40">
					<div className="px-3 py-1.5">
						<span className="text-[9px] uppercase tracking-wide text-muted-foreground font-medium">
							Most Crawled Pages
						</span>
					</div>
					{data.topPages.slice(0, 6).map((page, i) => (
						<div key={i} className="relative group">
							<div
								className="absolute inset-y-0 left-0 bg-amber-500/[0.05] pointer-events-none"
								style={{ width: `${(page.hits / maxHits) * 100}%` }}
							/>
							<div className="relative flex items-center gap-2 px-3 py-1.5">
								<span className="text-[9px] text-muted-foreground/40 tabular-nums w-3 shrink-0">{i + 1}</span>
								<span className="flex-1 text-[10px] text-foreground truncate font-mono">
									{page.path}
								</span>
								<span className="text-[10px] tabular-nums text-muted-foreground shrink-0">
									{page.hits}
								</span>
							</div>
						</div>
					))}
				</div>
			) : (
				<div className="px-3 py-4 flex items-center gap-2 text-[11px] text-muted-foreground">
					<ShieldAlert className="h-3.5 w-3.5 shrink-0" />
					No bot page hits in this period
				</div>
			)}
		</div>
	);
}
