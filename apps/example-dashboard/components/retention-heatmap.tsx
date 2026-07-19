"use client";

import { cn } from "@/lib/utils";
import { CalendarDays, Users2, TrendingDown, HelpCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface RetentionData {
	cohorts: {
		cohort: string;
		size: number;
		retention: {
			week: number;
			visitors: number;
			rate: number;
		}[];
	}[];
}

interface RetentionHeatmapProps {
	data: RetentionData | null;
	isLoading?: boolean;
}

function weekStatus(
	cohortDateStr: string,
	week: number,
): "complete" | "in_progress" | "not_started" {
	const weekStart =
		new Date(cohortDateStr + "T00:00:00Z").getTime() + week * 7 * 24 * 60 * 60 * 1000;
	const weekEnd = weekStart + 7 * 24 * 60 * 60 * 1000;
	const now = Date.now();
	if (now < weekStart) return "not_started";
	if (now < weekEnd) return "in_progress";
	return "complete";
}

export function RetentionHeatmap({ data, isLoading }: RetentionHeatmapProps) {
	if (isLoading) {
		return (
			<div className="bg-card border border-border rounded-sm">
				<div className="px-3 py-2 border-b border-border">
					<Skeleton className="h-3 w-36" />
				</div>
				<div className="flex border-b border-border divide-x divide-border">
					{[0, 1, 2].map((i) => (
						<div key={i} className="flex-1 px-3 py-3 space-y-1.5">
							<Skeleton className="h-4 w-12 mx-auto" />
							<Skeleton className="h-2.5 w-16 mx-auto" />
						</div>
					))}
				</div>
				<div className="p-3 space-y-2">
					{[0, 1, 2, 3, 4].map((i) => (
						<Skeleton key={i} className="h-10 w-full" />
					))}
				</div>
			</div>
		);
	}

	if (!data || !data.cohorts || data.cohorts.length === 0) {
		return (
			<div className="bg-card border border-border rounded-sm">
				<div className="px-3 py-2 border-b border-border">
					<h3 className="text-xs font-medium text-foreground flex items-center gap-1.5">
						<CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
						Retention Cohorts
					</h3>
				</div>
				<div className="p-8 text-center">
					<CalendarDays className="h-6 w-6 text-muted-foreground/50 mx-auto mb-2" />
					<p className="text-[11px] text-muted-foreground">
						Insufficient data for retention analysis
					</p>
				</div>
			</div>
		);
	}

	const totalUsers = data.cohorts.reduce((s, c) => s + c.size, 0);
	const maxCohortSize = Math.max(...data.cohorts.map((c) => c.size), 1);

	// Average week-1 return rate using only completed weeks
	const w1Rates = data.cohorts
		.map((c) => {
			const w1 = c.retention.find((r) => r.week === 1);
			return weekStatus(c.cohort, 1) === "complete" && w1 ? w1.rate : null;
		})
		.filter((r): r is number => r !== null);
	const avgW1 =
		w1Rates.length > 0
			? Math.round((w1Rates.reduce((s, r) => s + r, 0) / w1Rates.length) * 10) / 10
			: null;

	// Scale cell colors to actual data range (not a fixed 0–100% scale)
	const allRates = data.cohorts.flatMap((c) =>
		c.retention.filter((r) => r.week > 0).map((r) => r.rate),
	);
	const maxRate = Math.max(...allRates, 1);

	// Show only weeks that appear in data (skip week 0 — it's always 100%)
	const maxWeek = Math.max(...data.cohorts.flatMap((c) => c.retention.map((r) => r.week)));
	const weekColumns = Array.from({ length: Math.min(maxWeek, 5) }, (_, i) => i + 1);

	function cellBg(rate: number): string | undefined {
		if (rate === 0) return undefined;
		const intensity = Math.min(rate / (maxRate * 1.1), 1);
		const alpha = Math.round((0.15 + intensity * 0.72) * 100);
		return `hsl(142 71% 45% / ${alpha}%)`;
	}

	function weekRange(cohortDateStr: string, week: number): string {
		const start = new Date(
			new Date(cohortDateStr + "T00:00:00Z").getTime() + week * 7 * 24 * 60 * 60 * 1000,
		);
		const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
		function fmt(d: Date): string {
			return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
		}
		return `${fmt(start)} – ${fmt(end)}`;
	}

	return (
		<div className="bg-card border border-border rounded-sm">
			{/* Header */}
			<div className="px-3 py-2 border-b border-border flex items-center justify-between">
				<h3 className="text-xs font-medium text-foreground flex items-center gap-1.5">
					<CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
					Retention Cohorts
					<Tooltip>
						<TooltipTrigger asChild>
							<button
								type="button"
								aria-label="How to read this chart"
								className="text-muted-foreground/60 hover:text-muted-foreground transition-colors"
							>
								<HelpCircle className="h-3 w-3" />
							</button>
						</TooltipTrigger>
						<TooltipContent side="bottom" align="start" className="max-w-[280px]">
							<div className="space-y-1.5 text-[11px] leading-relaxed">
								<p>
									Each row is a cohort: visitors who showed up for the first time during that week.
								</p>
								<p>
									The Week 1–4 cells show what percentage of that cohort came back 1, 2, 3, or 4
									weeks after their first visit. Darker green means more of them returned.
								</p>
								<p>
									An amber outline marked &quot;live&quot; means that week is still running, so its
									number can still grow. A dash means the week hasn&apos;t started yet for that
									cohort.
								</p>
							</div>
						</TooltipContent>
					</Tooltip>
				</h3>
				<span className="text-[10px] text-muted-foreground">
					{data.cohorts.length} cohorts · {totalUsers.toLocaleString()} users
				</span>
			</div>

			{/* Summary strip */}
			<div className="flex border-b border-border/60 divide-x divide-border/60">
				<div className="flex-1 px-3 py-2.5 text-center">
					<p className="text-sm font-semibold text-foreground tabular-nums">
						{totalUsers.toLocaleString()}
					</p>
					<p className="text-[9px] uppercase tracking-wide text-muted-foreground mt-0.5">
						Total Users
					</p>
				</div>
				<Tooltip>
					<TooltipTrigger asChild>
						<div className="flex-1 px-3 py-2.5 text-center cursor-default">
							<p className="text-sm font-semibold text-foreground tabular-nums">
								{avgW1 !== null ? `${avgW1}%` : "—"}
							</p>
							<p className="text-[9px] uppercase tracking-wide text-muted-foreground mt-0.5">
								Avg W1 Return
							</p>
						</div>
					</TooltipTrigger>
					<TooltipContent side="bottom" className="max-w-[240px] text-[11px] leading-relaxed">
						Average share of each cohort that came back in the week after their first visit. Only
						fully completed weeks count, so cohorts still in their first week are excluded.
					</TooltipContent>
				</Tooltip>
				<Tooltip>
					<TooltipTrigger asChild>
						<div className="flex-1 px-3 py-2.5 text-center cursor-default">
							<p className="text-sm font-semibold text-foreground tabular-nums">
								{maxRate > 0 ? `${maxRate}%` : "—"}
							</p>
							<p className="text-[9px] uppercase tracking-wide text-muted-foreground mt-0.5">
								Peak Rate
							</p>
						</div>
					</TooltipTrigger>
					<TooltipContent side="bottom" className="max-w-[240px] text-[11px] leading-relaxed">
						The single best return rate in the table — the highest percentage of any cohort coming
						back in any week.
					</TooltipContent>
				</Tooltip>
			</div>

			{/* Table — Week 0 is omitted (always 100%, adds no information) */}
			<div className="overflow-x-auto">
				<table className="w-full text-xs border-collapse">
					<thead>
						<tr className="border-b border-border/50 bg-muted/20">
							<th className="text-left py-2 px-3 text-[10px] text-muted-foreground font-medium">
								Cohort
							</th>
							<th className="py-2 px-3 text-[10px] text-muted-foreground font-medium">
								<div className="flex items-center gap-1">
									<Users2 className="h-3 w-3" />
									Size
								</div>
							</th>
							{weekColumns.map((w) => (
								<th
									key={w}
									className="text-center py-2 px-2 text-[10px] text-muted-foreground font-medium whitespace-nowrap"
									style={{ minWidth: 72 }}
								>
									Week {w}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{data.cohorts.map((cohort) => {
							const date = new Date(cohort.cohort + "T12:00:00Z").toLocaleDateString("en-US", {
								month: "short",
								day: "numeric",
							});

							return (
								<tr
									key={cohort.cohort}
									className="border-t border-border/30 hover:bg-muted/20 transition-colors"
								>
									<td className="py-2.5 px-3 font-medium text-foreground whitespace-nowrap">
										{date}
									</td>
									<td className="py-2.5 px-3">
										<div className="flex items-center gap-2">
											<div className="w-10 h-1.5 bg-muted rounded-full overflow-hidden">
												<div
													className="h-full bg-blue-500/60 rounded-full"
													style={{ width: `${(cohort.size / maxCohortSize) * 100}%` }}
												/>
											</div>
											<span className="text-muted-foreground tabular-nums text-[10px]">
												{cohort.size}
											</span>
										</div>
									</td>
									{weekColumns.map((w) => {
										const status = weekStatus(cohort.cohort, w);
										const weekData = cohort.retention.find((r) => r.week === w);
										const rate = weekData?.rate ?? 0;
										const visitors = weekData?.visitors ?? 0;
										const bg = rate > 0 ? cellBg(rate) : undefined;

										if (status === "not_started") {
											return (
												<td key={w} className="py-2.5 px-2 text-center">
													<div
														className="h-9 rounded flex items-center justify-center mx-auto"
														style={{ width: 64 }}
													>
														<span className="text-[9px] text-muted-foreground/25">—</span>
													</div>
												</td>
											);
										}

										return (
											<td key={w} className="py-2.5 px-2">
												<Tooltip>
													<TooltipTrigger asChild>
														<div
															className={cn(
																"h-9 rounded flex flex-col items-center justify-center mx-auto transition-all cursor-default select-none",
																rate === 0 && "bg-muted/20",
																status === "in_progress" && "ring-1 ring-inset ring-amber-500/40",
															)}
															style={{ width: 64, backgroundColor: bg }}
														>
															{rate > 0 ? (
																<>
																	<span
																		className={cn(
																			"text-[10px] font-semibold leading-none",
																			rate / maxRate > 0.5 ? "text-white" : "text-foreground",
																		)}
																	>
																		{rate}%
																	</span>
																	{status === "in_progress" && (
																		<span className="text-[7px] text-amber-400 mt-0.5 leading-none">
																			live
																		</span>
																	)}
																</>
															) : (
																<span className="text-[9px] text-muted-foreground/35">
																	{status === "in_progress" ? "···" : "0%"}
																</span>
															)}
														</div>
													</TooltipTrigger>
													<TooltipContent side="top" className="max-w-[240px]">
														<div className="space-y-0.5 text-[11px] leading-relaxed">
															<p className="font-medium">
																{date} cohort · Week {w} ({weekRange(cohort.cohort, w)})
															</p>
															<p>
																{visitors} of {cohort.size} visitors returned ({rate}%)
															</p>
															{status === "in_progress" && (
																<p className="text-amber-400">
																	Week still in progress — this number can still grow.
																</p>
															)}
														</div>
													</TooltipContent>
												</Tooltip>
											</td>
										);
									})}
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>

			{/* Footer: legend + benchmark note */}
			<div className="px-3 py-2 border-t border-border/50 flex flex-wrap items-center gap-x-4 gap-y-1">
				<div className="flex items-center gap-3 text-[9px] text-muted-foreground">
					<span className="flex items-center gap-1">
						<span className="inline-block w-3 h-3 rounded-sm bg-muted/20 border border-border/40" />
						0%
					</span>
					<span className="flex items-center gap-1">
						<span
							className="inline-block w-3 h-3 rounded-sm"
							style={{ backgroundColor: "hsl(142 71% 45% / 25%)" }}
						/>
						Low
					</span>
					<span className="flex items-center gap-1">
						<span
							className="inline-block w-3 h-3 rounded-sm"
							style={{ backgroundColor: "hsl(142 71% 45% / 87%)" }}
						/>
						High
					</span>
					<span className="flex items-center gap-1">
						<span className="inline-block w-3 h-3 rounded-sm bg-muted/20 border border-amber-500/40" />
						In progress
					</span>
				</div>
				{avgW1 !== null && avgW1 < 10 && (
					<span className="flex items-center gap-1 ml-auto text-[9px] text-muted-foreground">
						<TrendingDown className="h-3 w-3 shrink-0" />
						Typical for content sites: 3–8% W1 return
					</span>
				)}
			</div>
		</div>
	);
}
