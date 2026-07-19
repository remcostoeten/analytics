"use client";

import { cn } from "@/lib/utils";
import {
	Inbox,
	TrendingUp,
	Clock,
	MousePointerClick,
	ExternalLink,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";

interface EngagementData {
	scrollDepth: Array<{ bucket: string; count: number; percentage: number }>;
	timeOnPage: Array<{ bucket: string; count: number; percentage: number }>;
	topEngagedPages: Array<{
		path: string;
		host?: string | null;
		avgTimeMs: number;
		avgScrollDepth?: number;
		samples: number;
	}>;
}

interface EngagementMetricsProps {
	data: EngagementData | null;
	className?: string;
}

function formatTime(ms: number): string {
	const seconds = Math.floor(ms / 1000);
	if (seconds < 60) return `${seconds}s`;
	const mins = Math.floor(seconds / 60);
	const secs = seconds % 60;
	return `${mins}m ${secs}s`;
}

export function EngagementMetrics({ data, className }: EngagementMetricsProps) {
	if (!data) {
		return (
			<div
				className={cn(
					"bg-card border border-border rounded-sm",
					className,
				)}
			>
				<div className="px-3 py-2 border-b border-border">
					<h3 className="text-xs font-medium text-foreground">
						Engagement
					</h3>
				</div>
				<div className="p-3 space-y-3">
					{[0, 1, 2].map((i) => (
						<div key={i} className="space-y-1.5">
							<Skeleton className="h-2.5 w-24" />
							<Skeleton className="h-2 w-full rounded-full" />
						</div>
					))}
					<div className="pt-1 space-y-1.5">
						<Skeleton className="h-2.5 w-28 mb-2" />
						{[0, 1, 2].map((i) => (
							<div key={i} className="flex justify-between">
								<Skeleton className="h-3 w-32" />
								<Skeleton className="h-3 w-12" />
							</div>
						))}
					</div>
				</div>
			</div>
		);
	}

	const hasScrollData = data.scrollDepth && data.scrollDepth.length > 0;
	const hasTimeData = data.timeOnPage && data.timeOnPage.length > 0;
	const hasTopPages = data.topEngagedPages && data.topEngagedPages.length > 0;

	return (
		<div
			className={cn("bg-card border border-border rounded-sm", className)}
		>
			<div className="px-3 py-2 border-b border-border">
				<h3 className="text-xs font-medium text-foreground">
					Engagement Metrics
				</h3>
			</div>
			<div className="p-3 space-y-4">
				{/* Scroll Depth Distribution */}
				{hasScrollData && (
					<div>
						<div className="flex items-center gap-1.5 mb-2">
							<MousePointerClick className="h-3 w-3 text-chart-1" />
							<span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
								Scroll Depth
							</span>
						</div>
						<div className="space-y-1.5">
							{data.scrollDepth.map((item) => (
								<Tooltip key={item.bucket}>
									<TooltipTrigger asChild>
										<div className="flex items-center gap-2 cursor-default">
											<span className="text-[10px] text-muted-foreground w-14">
												{item.bucket}
											</span>
											<div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
												<div
													className="h-full bg-chart-1 rounded-full transition-all"
													style={{
														width: `${Math.min(100, item.percentage)}%`,
													}}
												/>
											</div>
											<span className="text-[10px] text-foreground tabular-nums w-10 text-right">
												{item.percentage.toFixed(1)}%
											</span>
										</div>
									</TooltipTrigger>
									<TooltipContent
										side="left"
										className="text-[11px]"
									>
										{item.count.toLocaleString()} pageview
										{item.count === 1 ? "" : "s"} scrolled
										to {item.bucket} of the page
									</TooltipContent>
								</Tooltip>
							))}
						</div>
					</div>
				)}

				{/* Time on Page Distribution */}
				{hasTimeData && (
					<div>
						<div className="flex items-center gap-1.5 mb-2">
							<Clock className="h-3 w-3 text-chart-2" />
							<span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
								Time on Page
							</span>
						</div>
						<div className="space-y-1.5">
							{data.timeOnPage.map((item) => (
								<Tooltip key={item.bucket}>
									<TooltipTrigger asChild>
										<div className="flex items-center gap-2 cursor-default">
											<span className="text-[10px] text-muted-foreground w-14">
												{item.bucket}
											</span>
											<div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
												<div
													className="h-full bg-chart-2 rounded-full transition-all"
													style={{
														width: `${Math.min(100, item.percentage)}%`,
													}}
												/>
											</div>
											<span className="text-[10px] text-foreground tabular-nums w-10 text-right">
												{item.percentage.toFixed(1)}%
											</span>
										</div>
									</TooltipTrigger>
									<TooltipContent
										side="left"
										className="text-[11px]"
									>
										{item.count.toLocaleString()} visit
										{item.count === 1 ? "" : "s"} stayed{" "}
										{item.bucket}
									</TooltipContent>
								</Tooltip>
							))}
						</div>
					</div>
				)}

				{/* Top Engaged Pages */}
				{hasTopPages && (
					<div>
						<div className="flex items-center gap-1.5 mb-2">
							<TrendingUp className="h-3 w-3 text-chart-3" />
							<span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
								Most Engaging Pages
							</span>
						</div>
						<div className="space-y-1">
							{data.topEngagedPages.slice(0, 5).map((page) => (
								<div
									key={page.path}
									className="flex items-center justify-between py-1 border-b border-border/50 last:border-0"
								>
									{page.host ? (
										<a
											href={`https://${page.host}${page.path}`}
											target="_blank"
											rel="noreferrer"
											title={`https://${page.host}${page.path}`}
											className="group inline-flex min-w-0 items-center gap-1 text-foreground hover:text-primary"
										>
											<span className="text-[10px] font-mono truncate max-w-[140px]">
												{page.path}
											</span>
											<ExternalLink className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
										</a>
									) : (
										<span className="text-[10px] text-foreground font-mono truncate max-w-[140px]">
											{page.path}
										</span>
									)}
									<Tooltip>
										<TooltipTrigger asChild>
											<div className="flex items-center gap-3 text-[10px] text-muted-foreground cursor-default">
												<span className="tabular-nums">
													{formatTime(page.avgTimeMs)}
												</span>
												{typeof page.avgScrollDepth ===
													"number" && (
													<span className="tabular-nums">
														{page.avgScrollDepth}%
													</span>
												)}
											</div>
										</TooltipTrigger>
										<TooltipContent
											side="left"
											className="text-[11px]"
										>
											Average time on page over{" "}
											{page.samples.toLocaleString()}{" "}
											visit
											{page.samples === 1 ? "" : "s"}
											{typeof page.avgScrollDepth ===
											"number"
												? ` · avg scroll depth ${page.avgScrollDepth}%`
												: ""}
										</TooltipContent>
									</Tooltip>
								</div>
							))}
						</div>
					</div>
				)}

				{!hasScrollData && !hasTimeData && !hasTopPages && (
					<div className="text-center py-4">
						<Inbox className="h-5 w-5 text-muted-foreground/50 mx-auto mb-1" />
						<p className="text-[10px] text-muted-foreground">
							No engagement data yet
						</p>
					</div>
				)}
			</div>
		</div>
	);
}
