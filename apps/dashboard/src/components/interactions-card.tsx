"use client";

import { MousePointerClick, ExternalLink, FileInput } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";
import type { InteractionStats } from "@/lib/queries/interactions";

type Props = {
	data: InteractionStats | null | undefined;
	className?: string;
};

type RowProps = {
	label: string;
	sublabel?: string | null;
	count: number;
	visitors: number;
	max: number;
	index: number;
};

function BarRow({ label, sublabel, count, visitors, max, index }: RowProps) {
	return (
		<div className="relative group">
			<div
				className="absolute inset-y-0 left-0 bg-primary/[0.06] pointer-events-none"
				style={{ width: `${(count / max) * 100}%` }}
			/>
			<div className="relative flex items-center gap-2 px-3 py-1.5">
				<span className="text-[10px] text-muted-foreground/40 tabular-nums w-3 shrink-0">
					{index + 1}
				</span>
				<span className="flex-1 text-[11px] text-foreground truncate font-mono" title={label}>
					{label}
				</span>
				{sublabel && (
					<span className="text-[10px] text-muted-foreground truncate max-w-[8rem] shrink-0">
						{sublabel}
					</span>
				)}
				<span className="text-[11px] tabular-nums text-muted-foreground shrink-0 w-10 text-right">
					{formatNumber(count)}
				</span>
				<span className="text-[10px] tabular-nums text-muted-foreground/60 shrink-0 w-10 text-right">
					{formatNumber(visitors)}
				</span>
			</div>
		</div>
	);
}

export function InteractionsCard({ data, className }: Props) {
	if (!data) {
		return (
			<div className={cn("rounded-lg border border-border bg-card", className)}>
				<div className="px-3 py-2 border-b border-border">
					<h3 className="text-xs font-medium text-foreground">Interactions</h3>
				</div>
				<div className="p-3 space-y-2">
					{[0, 1, 2, 3].map((i) => (
						<div key={i} className="flex items-center justify-between px-1">
							<Skeleton className="h-3 w-36" />
							<Skeleton className="h-3 w-10" />
						</div>
					))}
				</div>
			</div>
		);
	}

	const hasAny = data.elements.length > 0 || data.outbound.length > 0 || data.forms.length > 0;

	if (!hasAny) {
		return (
			<div className={cn("rounded-lg border border-border bg-card", className)}>
				<div className="px-3 py-2 border-b border-border">
					<h3 className="text-xs font-medium text-foreground">Interactions</h3>
				</div>
				<div className="p-6 text-center space-y-1">
					<MousePointerClick className="h-6 w-6 text-muted-foreground/40 mx-auto mb-2" />
					<p className="text-xs text-muted-foreground">No tracked interactions in this period</p>
					<p className="text-[11px] text-muted-foreground/70">
						Use <span className="font-mono">trackClick</span>,{" "}
						<span className="font-mono">&lt;TrackClick&gt;</span>, or enable{" "}
						<span className="font-mono">trackClicks</span> /{" "}
						<span className="font-mono">trackOutbound</span> /{" "}
						<span className="font-mono">trackForms</span> on{" "}
						<span className="font-mono">&lt;Analytics /&gt;</span>.
					</p>
				</div>
			</div>
		);
	}

	const maxElement = Math.max(...data.elements.map((e) => e.count), 1);
	const maxOutbound = Math.max(...data.outbound.map((o) => o.count), 1);
	const maxForm = Math.max(...data.forms.map((f) => f.count), 1);

	return (
		<div className={cn("rounded-lg border border-border bg-card", className)}>
			<div className="px-3 py-2 border-b border-border flex items-center justify-between">
				<div className="flex items-center gap-1.5">
					<MousePointerClick className="h-3.5 w-3.5 text-muted-foreground" />
					<h3 className="text-xs font-medium text-foreground">Interactions</h3>
				</div>
				<span className="text-[11px] text-muted-foreground tabular-nums">
					{formatNumber(data.totalClicks)} clicks · {formatNumber(data.clickVisitors)} visitors
				</span>
			</div>

			{data.elements.length > 0 && (
				<div className="divide-y divide-border/40">
					<div className="px-3 py-1.5 flex items-center justify-between">
						<span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
							Tracked Elements
						</span>
						<span className="text-[10px] uppercase tracking-wide text-muted-foreground/50">
							clicks / visitors
						</span>
					</div>
					{data.elements.map((element, i) => (
						<BarRow
							key={element.name}
							label={element.name}
							sublabel={element.topPath}
							count={element.count}
							visitors={element.visitors}
							max={maxElement}
							index={i}
						/>
					))}
				</div>
			)}

			{data.outbound.length > 0 && (
				<div className="divide-y divide-border/40 border-t border-border">
					<div className="px-3 py-1.5 flex items-center gap-1.5">
						<ExternalLink className="h-3 w-3 text-muted-foreground" />
						<span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
							Outbound Links
						</span>
					</div>
					{data.outbound.map((link, i) => (
						<BarRow
							key={link.domain}
							label={link.domain}
							sublabel={link.topUrl}
							count={link.count}
							visitors={link.visitors}
							max={maxOutbound}
							index={i}
						/>
					))}
				</div>
			)}

			{data.forms.length > 0 && (
				<div className="divide-y divide-border/40 border-t border-border">
					<div className="px-3 py-1.5 flex items-center gap-1.5">
						<FileInput className="h-3 w-3 text-muted-foreground" />
						<span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
							Form Submits
						</span>
					</div>
					{data.forms.map((form, i) => (
						<BarRow
							key={form.name}
							label={form.name}
							sublabel={form.method?.toUpperCase()}
							count={form.count}
							visitors={form.visitors}
							max={maxForm}
							index={i}
						/>
					))}
				</div>
			)}
		</div>
	);
}
