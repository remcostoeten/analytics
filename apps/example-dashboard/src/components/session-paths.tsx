"use client";

import { cn } from "@/lib/utils";
import { ArrowRight, Inbox, Route } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface PathData {
	path: string;
	count: number;
	percentage: number;
}

interface SessionPathsProps {
	data: PathData[] | null;
	isLoading?: boolean;
}

function abbreviate(segment: string): string {
	if (segment === "/") return "Home";
	const parts = segment.split("/").filter(Boolean);
	if (parts.length === 0) return "/";
	const last = parts[parts.length - 1];
	// Replace hyphens with spaces, truncate
	const readable = last.replace(/-/g, " ");
	return readable.length > 22 ? readable.slice(0, 20) + "…" : readable;
}

export function SessionPaths({ data, isLoading }: SessionPathsProps) {
	if (isLoading) {
		return (
			<div className="bg-card border border-border rounded-sm">
				<div className="px-3 py-2 border-b border-border">
					<Skeleton className="h-3 w-32" />
				</div>
				<div className="divide-y divide-border/50">
					{[0, 1, 2, 3, 4].map((i) => (
						<div key={i} className="px-3 py-2.5 flex items-center gap-3">
							<Skeleton className="h-3 w-4 shrink-0" />
							<Skeleton className="h-5 flex-1" />
							<Skeleton className="h-3 w-12 shrink-0" />
						</div>
					))}
				</div>
			</div>
		);
	}

	if (!data || data.length === 0) {
		return (
			<div className="bg-card border border-border rounded-sm">
				<div className="px-3 py-2 border-b border-border">
					<h3 className="text-xs font-medium text-foreground flex items-center gap-1.5">
						<Route className="h-3.5 w-3.5 text-muted-foreground" />
						Top User Journeys
					</h3>
				</div>
				<div className="p-6 text-center">
					<Inbox className="h-6 w-6 text-muted-foreground/50 mx-auto mb-2" />
					<p className="text-[11px] text-muted-foreground">No journey data available</p>
				</div>
			</div>
		);
	}

	const totalTracked = data.reduce((s, d) => s + d.count, 0);
	const maxCount = Math.max(...data.map((d) => d.count), 1);

	return (
		<div className="bg-card border border-border rounded-sm">
			<div className="px-3 py-2 border-b border-border flex items-center justify-between">
				<h3 className="text-xs font-medium text-foreground flex items-center gap-1.5">
					<Route className="h-3.5 w-3.5 text-muted-foreground" />
					Top User Journeys
				</h3>
				<span className="text-[10px] text-muted-foreground tabular-nums">
					{totalTracked} sessions
				</span>
			</div>

			<div className="divide-y divide-border/40">
				{data.slice(0, 10).map((item, index) => {
					const rawSegments = item.path.split(" → ").map((s) => s.trim());
					const segments = rawSegments.map(abbreviate);

					// Detect single-page visits (entry == exit, e.g. "/ → /")
					const isSinglePage = rawSegments.length === 2 && rawSegments[0] === rawSegments[1];

					// Detect round-trips (start === end, length > 2)
					const isRoundTrip =
						!isSinglePage &&
						rawSegments.length > 2 &&
						rawSegments[0] === rawSegments[rawSegments.length - 1];

					return (
						<div key={index} className="relative group">
							{/* Background bar (subtle, behind content) */}
							<div
								className="absolute inset-y-0 left-0 bg-blue-500/[0.04] pointer-events-none"
								style={{ width: `${(item.count / maxCount) * 100}%` }}
							/>

							<div className="relative flex items-center gap-2.5 px-3 py-2.5">
								{/* Rank */}
								<span className="text-[9px] font-medium text-muted-foreground/50 tabular-nums w-4 shrink-0 text-right">
									{index + 1}
								</span>

								{/* Path */}
								<div className="flex-1 min-w-0">
									{isSinglePage ? (
										<div className="flex items-center gap-1.5">
											<span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-muted text-foreground">
												{segments[0]}
											</span>
											<span className="text-[9px] text-muted-foreground italic">
												single page visit
											</span>
										</div>
									) : (
										<div className="flex items-center gap-1 flex-wrap">
											{segments.map((seg, i) => (
												<span key={i} className="flex items-center gap-1">
													<span
														className={cn(
															"px-1.5 py-0.5 rounded text-[9px] font-medium whitespace-nowrap",
															i === 0
																? "bg-muted text-foreground"
																: i === segments.length - 1 && isRoundTrip
																	? "bg-muted/60 text-muted-foreground"
																	: "bg-blue-500/10 text-blue-400 dark:text-blue-300",
														)}
													>
														{seg}
													</span>
													{i < segments.length - 1 && (
														<ArrowRight className="h-2.5 w-2.5 text-muted-foreground/30 shrink-0" />
													)}
												</span>
											))}
											{isRoundTrip && (
												<span className="text-[9px] text-muted-foreground/50 italic ml-0.5">
													roundtrip
												</span>
											)}
										</div>
									)}
								</div>

								{/* Stats */}
								<div className="flex items-center gap-2.5 shrink-0">
									<span className="text-[10px] font-semibold text-foreground tabular-nums">
										{item.percentage}%
									</span>
									<span className="text-[9px] text-muted-foreground tabular-nums w-6 text-right">
										{item.count}
									</span>
								</div>
							</div>
						</div>
					);
				})}
			</div>

			{data.length > 10 && (
				<div className="px-3 py-2 border-t border-border/50">
					<span className="text-[10px] text-muted-foreground">
						+{data.length - 10} more journeys
					</span>
				</div>
			)}
		</div>
	);
}
