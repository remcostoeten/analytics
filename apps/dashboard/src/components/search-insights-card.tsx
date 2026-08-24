"use client";

import { Search, SearchX } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";
import type { SearchStats } from "@/lib/queries/search";

type Props = {
	data: SearchStats | null | undefined;
	className?: string;
};

export function SearchInsightsCard({ data, className }: Props) {
	if (!data) {
		return (
			<div className={cn("rounded-lg border border-border bg-card", className)}>
				<div className="px-3 py-2 border-b border-border">
					<h3 className="text-xs font-medium text-foreground">Site Search</h3>
				</div>
				<div className="p-3 space-y-2">
					{[0, 1, 2].map((i) => (
						<div key={i} className="flex items-center justify-between px-1">
							<Skeleton className="h-3 w-32" />
							<Skeleton className="h-3 w-10" />
						</div>
					))}
				</div>
			</div>
		);
	}

	if (data.total === 0) {
		return (
			<div className={cn("rounded-lg border border-border bg-card", className)}>
				<div className="px-3 py-2 border-b border-border">
					<h3 className="text-xs font-medium text-foreground">Site Search</h3>
				</div>
				<div className="p-6 text-center space-y-1">
					<Search className="h-6 w-6 text-muted-foreground/40 mx-auto mb-2" />
					<p className="text-xs text-muted-foreground">No searches in this period</p>
					<p className="text-[11px] text-muted-foreground/70">
						Call <span className="font-mono">trackSearch(query, resultCount)</span> to record one.
					</p>
				</div>
			</div>
		);
	}

	const maxCount = Math.max(...data.queries.map((q) => q.count), 1);

	return (
		<div className={cn("rounded-lg border border-border bg-card", className)}>
			<div className="px-3 py-2 border-b border-border flex items-center justify-between">
				<div className="flex items-center gap-1.5">
					<Search className="h-3.5 w-3.5 text-muted-foreground" />
					<h3 className="text-xs font-medium text-foreground">Site Search</h3>
				</div>
				<span className="text-[11px] text-muted-foreground tabular-nums">
					{formatNumber(data.total)} searches · {formatNumber(data.searchers)} visitors
				</span>
			</div>

			{data.zeroResultSearches > 0 && (
				<div className="px-3 py-2 border-b border-border flex items-center gap-2">
					<SearchX className="h-3.5 w-3.5 text-amber-500 shrink-0" />
					<span className="text-[11px] text-muted-foreground">
						<span className="font-semibold text-amber-500 tabular-nums">
							{data.zeroResultRate.toFixed(1)}%
						</span>{" "}
						of searches returned nothing
					</span>
				</div>
			)}

			<div className="divide-y divide-border/40">
				<div className="px-3 py-1.5 flex items-center justify-between">
					<span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
						Top Queries
					</span>
					<span className="text-[10px] uppercase tracking-wide text-muted-foreground/50">
						avg results
					</span>
				</div>
				{data.queries.map((entry, i) => (
					<div key={entry.query} className="relative group">
						<div
							className="absolute inset-y-0 left-0 bg-primary/[0.06] pointer-events-none"
							style={{ width: `${(entry.count / maxCount) * 100}%` }}
						/>
						<div className="relative flex items-center gap-2 px-3 py-1.5">
							<span className="text-[10px] text-muted-foreground/40 tabular-nums w-3 shrink-0">
								{i + 1}
							</span>
							<span className="flex-1 truncate text-[11px] text-foreground" title={entry.query}>
								{entry.query}
							</span>
							<span className="shrink-0 tabular-nums text-[11px] text-muted-foreground w-8 text-right">
								{formatNumber(entry.count)}
							</span>
							<span className="shrink-0 tabular-nums text-[11px] text-muted-foreground/70 w-10 text-right">
								{entry.averageResults === null ? "—" : entry.averageResults.toFixed(1)}
							</span>
						</div>
					</div>
				))}
			</div>

			{data.zeroResultQueries.length > 0 && (
				<div className="border-t border-border divide-y divide-border/40">
					<div className="px-3 py-1.5 flex items-center gap-1.5">
						<SearchX className="h-3 w-3 text-amber-500" />
						<span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
							Nothing Found
						</span>
					</div>
					{data.zeroResultQueries.map((entry) => (
						<div key={entry.query} className="flex items-center gap-2 px-3 py-1.5">
							<span className="flex-1 truncate text-[11px] text-foreground" title={entry.query}>
								{entry.query}
							</span>
							<span className="shrink-0 tabular-nums text-[11px] text-amber-500">
								×{formatNumber(entry.zeroResultCount)}
							</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
