"use client";

import { cn } from "@/lib/utils";
import { Inbox, Search, User } from "lucide-react";
import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import type { Route } from "next";
import { Input } from "@/components/ui/input";
import { getFlagEmoji } from "@/lib/format";

type VisitorExplorerRow = {
	id: string;
	fingerprint: string;
	firstSeen: string;
	lastSeen: string;
	visitCount: number;
	deviceType: string | null;
	browser: string | null;
	os: string | null;
	country: string | null;
	city: string | null;
	isInternal: boolean;
};

type VisitorExplorerResponse = {
	rows: VisitorExplorerRow[];
	total: number;
};

type Segment = "all" | "new" | "returning";
type Sort = "last_seen" | "visit_count" | "first_seen";

type Props = {
	buildQuery: (metric: string, extraParams?: string) => string;
	className?: string;
};

async function fetcher(url: string): Promise<VisitorExplorerResponse> {
	const response = await fetch(url);
	if (!response.ok) throw new Error("Failed to load visitors");
	return response.json();
}

function formatTimeAgo(dateStr: string): string {
	const date = new Date(dateStr);
	const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

	if (seconds < 60) return "just now";
	if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
	if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
	return `${Math.floor(seconds / 86400)}d ago`;
}

const deviceIcons: Record<string, string> = {
	desktop: "D",
	mobile: "M",
	tablet: "T",
	bot: "B",
};

const SEGMENTS: { id: Segment; label: string }[] = [
	{ id: "all", label: "All" },
	{ id: "new", label: "New" },
	{ id: "returning", label: "Returning" },
];

export function VisitorsTable({ buildQuery, className }: Props) {
	const [segment, setSegment] = useState<Segment>("all");
	const [sort, setSort] = useState<Sort>("last_seen");
	const [search, setSearch] = useState("");

	const { data, isLoading } = useSWR(
		buildQuery("visitors-explorer", `segment=${segment}&sort=${sort}&limit=25`),
		fetcher,
		{ fallbackData: { rows: [], total: 0 }, refreshInterval: 30000, keepPreviousData: true },
	);

	const rows = data?.rows ?? [];
	const filtered = search.trim()
		? rows.filter((v) => {
				const q = search.toLowerCase();
				return (
					(v.country || "").toLowerCase().includes(q) ||
					(v.city || "").toLowerCase().includes(q) ||
					(v.browser || "").toLowerCase().includes(q) ||
					(v.os || "").toLowerCase().includes(q) ||
					(v.deviceType || "").toLowerCase().includes(q)
				);
			})
		: rows;

	return (
		<div className={cn("bg-card border border-border rounded-sm", className)}>
			<div className="px-3 py-2 border-b border-border flex items-center gap-2 flex-wrap">
				<h3 className="text-xs font-medium text-foreground shrink-0">Visitors</h3>
				<div className="flex items-center gap-1 shrink-0">
					{SEGMENTS.map((s) => (
						<button
							key={s.id}
							onClick={() => setSegment(s.id)}
							className={cn(
								"px-2 py-0.5 rounded text-[10px] font-medium transition-colors",
								segment === s.id
									? "bg-foreground text-background"
									: "text-muted-foreground hover:bg-muted",
							)}
						>
							{s.label}
						</button>
					))}
				</div>
				<select
					value={sort}
					onChange={(e) => setSort(e.target.value as Sort)}
					className="h-6 text-[10px] bg-muted/50 border border-border rounded px-1"
				>
					<option value="last_seen">Last seen</option>
					<option value="visit_count">Visit count</option>
					<option value="first_seen">First seen</option>
				</select>
				<div className="relative flex-1 min-w-[120px] max-w-[200px] ml-auto">
					<Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
					<Input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Filter by country, browser…"
						className="h-6 pl-6 pr-2 text-[10px] bg-muted/50 border-border"
					/>
				</div>
				<span className="text-[10px] text-muted-foreground shrink-0">
					{filtered.length}/{data?.total ?? 0}
				</span>
			</div>

			{!isLoading && filtered.length === 0 ? (
				<div className="p-6 text-center">
					<Inbox className="h-6 w-6 text-muted-foreground/50 mx-auto mb-2" />
					<p className="text-[11px] text-muted-foreground">No visitors match this segment</p>
				</div>
			) : (
				<div className="overflow-x-auto max-h-[300px] overflow-y-auto">
					<table className="w-full text-[11px]">
						<thead className="sticky top-0 bg-card z-10">
							<tr className="border-b border-border bg-muted/30">
								<th className="px-3 py-1.5 text-left font-medium text-muted-foreground uppercase tracking-wide">
									Visitor
								</th>
								<th className="px-3 py-1.5 text-left font-medium text-muted-foreground uppercase tracking-wide">
									Location
								</th>
								<th className="px-3 py-1.5 text-left font-medium text-muted-foreground uppercase tracking-wide">
									Device
								</th>
								<th className="px-3 py-1.5 text-right font-medium text-muted-foreground uppercase tracking-wide">
									Visits
								</th>
								<th className="px-3 py-1.5 text-right font-medium text-muted-foreground uppercase tracking-wide">
									Last Seen
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{filtered.map((visitor) => (
								<tr key={visitor.id} className="hover:bg-muted/50 transition-colors">
									<td className="px-3 py-1.5">
										<Link
											href={`/visitor/${visitor.fingerprint}` as Route}
											className="flex items-center gap-2 group"
										>
											<div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
												<User className="h-3 w-3 text-muted-foreground" />
											</div>
											<span className="font-mono text-[9px] text-muted-foreground group-hover:text-foreground group-hover:underline">
												{visitor.fingerprint?.slice(0, 8) || visitor.id.slice(0, 8)}
											</span>
										</Link>
									</td>
									<td className="px-3 py-1.5">
										<div className="flex items-center gap-1.5">
											{visitor.country && (
												<span className="text-sm">{getFlagEmoji(visitor.country)}</span>
											)}
											<span className="text-foreground truncate max-w-[100px]">
												{visitor.city || visitor.country || "Unknown"}
											</span>
										</div>
									</td>
									<td className="px-3 py-1.5">
										<div className="flex items-center gap-1.5">
											<span
												className={cn(
													"inline-flex items-center justify-center w-4 h-4 rounded text-[8px] font-bold",
													visitor.deviceType === "desktop" &&
														"bg-blue-500/15 text-blue-600 dark:text-blue-400",
													visitor.deviceType === "mobile" &&
														"bg-green-500/15 text-green-600 dark:text-green-400",
													visitor.deviceType === "tablet" &&
														"bg-purple-500/15 text-purple-600 dark:text-purple-400",
													(!visitor.deviceType || visitor.deviceType === "unknown") &&
														"bg-muted text-muted-foreground",
												)}
											>
												{deviceIcons[visitor.deviceType || "unknown"] || "?"}
											</span>
											<span className="text-muted-foreground truncate max-w-[80px]">
												{visitor.browser || "Unknown"}
											</span>
										</div>
									</td>
									<td className="px-3 py-1.5 text-right tabular-nums">
										<span
											className={cn(
												"font-medium",
												visitor.visitCount > 5 && "text-emerald-600 dark:text-emerald-400",
												visitor.visitCount <= 5 && visitor.visitCount > 1 && "text-foreground",
												visitor.visitCount === 1 && "text-muted-foreground",
											)}
										>
											{visitor.visitCount}
										</span>
									</td>
									<td className="px-3 py-1.5 text-right text-muted-foreground">
										{formatTimeAgo(visitor.lastSeen)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
