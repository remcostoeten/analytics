"use client";

import { useMemo } from "react";
import useSWR from "swr";
import Link from "next/link";
import type { Route } from "next";
import { ChevronRight, Radar } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GeoSignal } from "@/lib/queries/signals";

type Props = {
	timeRange: string;
	projectId?: string | null;
	className?: string;
};

const SEVERITY_STYLES: Record<GeoSignal["severity"], string> = {
	high: "bg-red-500/15 text-red-600 dark:text-red-400",
	medium: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
	info: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
};

async function fetcher(url: string) {
	const response = await fetch(url);
	const info = await response.json();
	if (!response.ok) throw new Error(info?.message || info?.error || "Signals request failed");
	return info;
}

export function SignalsPanel({ timeRange, projectId, className }: Props) {
	const query = useMemo(() => {
		const params = new URLSearchParams({ metric: "geo-signals", timeRange });
		if (projectId) params.set("projectId", projectId);
		return `/api/analytics?${params.toString()}`;
	}, [timeRange, projectId]);

	const { data: signals, isLoading } = useSWR<GeoSignal[]>(query, fetcher, {
		keepPreviousData: true,
		revalidateOnFocus: false,
	});

	return (
		<section className={cn("bg-card border border-border rounded-sm overflow-hidden", className)}>
			<div className="px-3 py-2 border-b border-border flex items-center justify-between">
				<h2 className="text-xs font-medium text-foreground flex items-center gap-1.5">
					<Radar className="h-3.5 w-3.5" />
					Signals
				</h2>
				<span className="text-[10px] text-muted-foreground tabular-nums">
					{signals?.length ?? 0} in range
				</span>
			</div>
			<div className="divide-y divide-border/50 max-h-[300px] overflow-y-auto">
				{(signals ?? []).map((signal, i) => (
					<Link
						key={`${signal.kind}-${i}`}
						href={signal.href as Route}
						className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 transition-colors group"
					>
						<span
							className={cn(
								"text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded shrink-0 tabular-nums",
								SEVERITY_STYLES[signal.severity],
							)}
						>
							{signal.severity}
						</span>
						<span className="min-w-0 flex-1">
							<span className="block text-xs text-foreground truncate">{signal.title}</span>
							<span className="block text-[10px] text-muted-foreground truncate">
								{signal.description}
							</span>
						</span>
						<ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/0 group-hover:text-muted-foreground/70 transition-colors" />
					</Link>
				))}
				{!isLoading && (signals?.length ?? 0) === 0 && (
					<p className="px-3 py-6 text-xs text-muted-foreground text-center">
						No anomalies in this range
					</p>
				)}
			</div>
		</section>
	);
}
