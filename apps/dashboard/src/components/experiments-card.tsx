"use client";

import { FlaskConical } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";
import type { Experiment, ExperimentVariant } from "@/lib/queries/experiments";

type Props = {
	data: Experiment[] | null | undefined;
	className?: string;
};

function bestVariant(variants: ExperimentVariant[]): ExperimentVariant | null {
	const withTraffic = variants.filter((variant) => variant.visitors > 0);
	if (withTraffic.length < 2) return null;
	const sorted = [...withTraffic].sort((a, b) => b.conversionRate - a.conversionRate);
	if (sorted[0].conversionRate === sorted[1].conversionRate) return null;
	return sorted[0];
}

export function ExperimentsCard({ data, className }: Props) {
	if (!data) {
		return (
			<div className={cn("rounded-lg border border-border bg-card", className)}>
				<div className="px-3 py-2 border-b border-border">
					<h3 className="text-xs font-medium text-foreground">Experiments</h3>
				</div>
				<div className="p-3 space-y-2">
					{[0, 1, 2].map((i) => (
						<div key={i} className="flex items-center justify-between px-1">
							<Skeleton className="h-3 w-32" />
							<Skeleton className="h-3 w-12" />
						</div>
					))}
				</div>
			</div>
		);
	}

	if (data.length === 0) {
		return (
			<div className={cn("rounded-lg border border-border bg-card", className)}>
				<div className="px-3 py-2 border-b border-border">
					<h3 className="text-xs font-medium text-foreground">Experiments</h3>
				</div>
				<div className="p-6 text-center space-y-1">
					<FlaskConical className="h-6 w-6 text-muted-foreground/40 mx-auto mb-2" />
					<p className="text-xs text-muted-foreground">No variant assignments in this period</p>
					<p className="text-[11px] text-muted-foreground/70">
						Call <span className="font-mono">setExperiment(id, variant)</span> to split metrics by
						variant.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className={cn("rounded-lg border border-border bg-card", className)}>
			<div className="px-3 py-2 border-b border-border flex items-center justify-between">
				<div className="flex items-center gap-1.5">
					<FlaskConical className="h-3.5 w-3.5 text-muted-foreground" />
					<h3 className="text-xs font-medium text-foreground">Experiments</h3>
				</div>
				<span className="text-[11px] text-muted-foreground tabular-nums">
					{data.length} running
				</span>
			</div>

			<div className="divide-y divide-border">
				{data.map((experiment) => {
					const leader = bestVariant(experiment.variants);
					const maxVisitors = Math.max(...experiment.variants.map((v) => v.visitors), 1);

					return (
						<div key={experiment.experimentId} className="py-1.5">
							<div className="px-3 py-1 flex items-center justify-between gap-2">
								<span
									className="text-[11px] font-mono text-foreground truncate"
									title={experiment.experimentId}
								>
									{experiment.experimentId}
								</span>
								<span className="text-[10px] uppercase tracking-wide text-muted-foreground/50 shrink-0">
									visitors / conv.
								</span>
							</div>

							{experiment.variants.map((variant) => (
								<div key={variant.variant} className="relative group">
									<div
										className="absolute inset-y-0 left-0 bg-primary/[0.06] pointer-events-none"
										style={{ width: `${(variant.visitors / maxVisitors) * 100}%` }}
									/>
									<div className="relative flex items-center gap-2 px-3 py-1.5">
										<span
											className="flex-1 text-[11px] text-foreground truncate font-mono"
											title={variant.variant}
										>
											{variant.variant}
											{leader?.variant === variant.variant && (
												<span className="ml-1.5 text-[10px] text-emerald-500 font-sans">
													leading
												</span>
											)}
										</span>
										<span className="text-[11px] tabular-nums text-muted-foreground shrink-0 w-12 text-right">
											{formatNumber(variant.visitors)}
										</span>
										<span className="text-[11px] tabular-nums text-muted-foreground shrink-0 w-14 text-right">
											{variant.conversionRate.toFixed(1)}%
										</span>
									</div>
								</div>
							))}
						</div>
					);
				})}
			</div>

			<div className="px-3 py-1.5 border-t border-border">
				<p className="text-[10px] text-muted-foreground/70">
					Conversion counts visitors firing transaction, purchase, or conversion events. No
					significance testing — treat close rates as inconclusive.
				</p>
			</div>
		</div>
	);
}
