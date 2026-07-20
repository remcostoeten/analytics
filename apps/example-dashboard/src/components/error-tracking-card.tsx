"use client";

import { ShieldCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";
import type { ErrorStats } from "@/lib/queries/errors";

type Props = {
	data: ErrorStats | null | undefined;
	className?: string;
};

function formatTimeAgo(timestamp: string): string {
	const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
	if (seconds < 60) return "just now";
	if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
	if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
	return `${Math.floor(seconds / 86400)}d ago`;
}

export function ErrorTrackingCard({ data, className }: Props) {
	if (!data) {
		return (
			<div className={cn("bg-card border border-border rounded-sm", className)}>
				<div className="px-3 py-2 border-b border-border">
					<h3 className="text-xs font-medium text-foreground">JavaScript Errors</h3>
				</div>
				<div className="p-3 space-y-2">
					{[0, 1, 2].map((i) => (
						<div key={i} className="flex items-center justify-between px-1">
							<Skeleton className="h-3 w-40" />
							<Skeleton className="h-3 w-10" />
						</div>
					))}
				</div>
			</div>
		);
	}

	if (data.total === 0) {
		return (
			<div className={cn("bg-card border border-border rounded-sm", className)}>
				<div className="px-3 py-2 border-b border-border">
					<h3 className="text-xs font-medium text-foreground">JavaScript Errors</h3>
				</div>
				<div className="p-6 text-center">
					<ShieldCheck className="h-6 w-6 text-emerald-500/60 mx-auto mb-2" />
					<p className="text-[11px] text-muted-foreground">No errors in this period</p>
				</div>
			</div>
		);
	}

	return (
		<div className={cn("bg-card border border-border rounded-sm", className)}>
			<div className="px-3 py-2 border-b border-border flex items-center justify-between">
				<h3 className="text-xs font-medium text-foreground">JavaScript Errors</h3>
				<span className="text-[10px] text-muted-foreground tabular-nums">
					{formatNumber(data.total)} errors · {formatNumber(data.affectedSessions)} sessions
				</span>
			</div>
			<div className="divide-y divide-border">
				{data.groups.slice(0, 8).map((group) => (
					<div key={group.message} className="px-3 py-2 space-y-1">
						<div className="flex items-start justify-between gap-2">
							<p
								className="text-[11px] text-foreground font-mono leading-snug break-all line-clamp-2"
								title={group.message}
							>
								{group.message}
							</p>
							<span className="shrink-0 inline-flex items-center px-1.5 py-0.5 text-[9px] font-bold rounded border bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 tabular-nums">
								×{formatNumber(group.count)}
							</span>
						</div>
						<div className="flex items-center gap-2 text-[10px] text-muted-foreground">
							<span className="tabular-nums">
								{formatNumber(group.visitors)} visitor{group.visitors === 1 ? "" : "s"}
							</span>
							{group.topPath && <span className="truncate max-w-[10rem]">{group.topPath}</span>}
							{group.topBrowser && <span>{group.topBrowser}</span>}
							<span className="ml-auto shrink-0">{formatTimeAgo(group.lastSeen)}</span>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
