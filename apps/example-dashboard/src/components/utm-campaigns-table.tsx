"use client";

import { cn } from "@/lib/utils";
import { Inbox, Tag } from "lucide-react";

type UTMCampaign = {
	source: string | null;
	medium: string | null;
	campaign: string | null;
	visits: number;
	visitors: number;
	percentage: number;
};

type UTMCampaignsTableProps = {
	data: UTMCampaign[] | null;
	className?: string;
};

function Badge({ value, color }: { value: string; color: string }) {
	return <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-medium", color)}>{value}</span>;
}

const mediumColors: Record<string, string> = {
	organic: "bg-emerald-500/10 text-emerald-500",
	cpc: "bg-blue-500/10 text-blue-500",
	paid: "bg-blue-500/10 text-blue-500",
	email: "bg-purple-500/10 text-purple-500",
	social: "bg-orange-500/10 text-orange-500",
	referral: "bg-cyan-500/10 text-cyan-500",
	direct: "bg-muted text-muted-foreground",
};

export function UTMCampaignsTable({ data, className }: UTMCampaignsTableProps) {
	if (!data || data.length === 0) {
		return (
			<div className={cn("bg-card border border-border rounded-sm", className)}>
				<div className="px-3 py-2 border-b border-border flex items-center gap-1.5">
					<Tag className="h-3.5 w-3.5 text-muted-foreground" />
					<h3 className="text-xs font-medium text-foreground">UTM Campaigns</h3>
				</div>
				<div className="p-6 text-center">
					<Inbox className="h-6 w-6 text-muted-foreground/50 mx-auto mb-2" />
					<p className="text-[11px] text-muted-foreground">No campaign traffic in this period</p>
					<p className="text-[10px] text-muted-foreground/60 mt-1">
						Add <code className="font-mono">?utm_source=…</code> to track campaigns
					</p>
				</div>
			</div>
		);
	}

	const maxVisits = Math.max(...data.map((d) => d.visits), 1);

	return (
		<div className={cn("bg-card border border-border rounded-sm", className)}>
			<div className="px-3 py-2 border-b border-border flex items-center justify-between">
				<div className="flex items-center gap-1.5">
					<Tag className="h-3.5 w-3.5 text-muted-foreground" />
					<h3 className="text-xs font-medium text-foreground">UTM Campaigns</h3>
				</div>
				<span className="text-[10px] text-muted-foreground">{data.length} sources</span>
			</div>

			<div className="overflow-x-auto">
				<table className="w-full text-[11px]">
					<thead>
						<tr className="border-b border-border bg-muted/20">
							<th className="px-3 py-1.5 text-left text-[10px] font-medium text-muted-foreground">
								Source / Medium
							</th>
							<th className="px-3 py-1.5 text-left text-[10px] font-medium text-muted-foreground">
								Campaign
							</th>
							<th className="px-3 py-1.5 text-right text-[10px] font-medium text-muted-foreground">
								Sessions
							</th>
							<th className="px-3 py-1.5 text-right text-[10px] font-medium text-muted-foreground">
								Share
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-border/40">
						{data.map((row, i) => {
							const mediumColor =
								mediumColors[row.medium?.toLowerCase() || "direct"] ||
								"bg-muted text-muted-foreground";
							return (
								<tr key={i} className="relative group hover:bg-muted/30 transition-colors">
									<td className="px-3 py-2">
										<div className="flex items-center gap-1.5 flex-wrap">
											{row.source && (
												<span className="font-medium text-foreground">{row.source}</span>
											)}
											{row.medium && <Badge value={row.medium} color={mediumColor} />}
											{!row.source && !row.medium && (
												<span className="text-muted-foreground italic">direct</span>
											)}
										</div>
									</td>
									<td className="px-3 py-2">
										{row.campaign ? (
											<span className="text-foreground truncate max-w-[180px] block">
												{row.campaign}
											</span>
										) : (
											<span className="text-muted-foreground/40">—</span>
										)}
									</td>
									<td className="px-3 py-2 text-right">
										<div className="flex items-center justify-end gap-2">
											<div className="w-16 h-1 bg-muted rounded-full overflow-hidden hidden sm:block">
												<div
													className="h-full bg-primary/60 rounded-full"
													style={{ width: `${(row.visits / maxVisits) * 100}%` }}
												/>
											</div>
											<span className="font-medium tabular-nums text-foreground">
												{row.visits.toLocaleString()}
											</span>
										</div>
									</td>
									<td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
										{row.percentage.toFixed(1)}%
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</div>
	);
}
