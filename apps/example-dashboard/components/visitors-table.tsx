"use client";

import { cn } from "@/lib/utils";
import { Inbox, User, Monitor, Globe, Clock } from "lucide-react";
import { useState } from "react";

interface Visitor {
	id: string;
	fingerprint: string;
	firstSeen: string;
	lastSeen: string;
	visitCount: number;
	deviceType: string | null;
	os: string | null;
	osVersion: string | null;
	browser: string | null;
	browserVersion: string | null;
	screenResolution: string | null;
	timezone: string | null;
	language: string | null;
	country: string | null;
	region: string | null;
	city: string | null;
}

interface VisitorsTableProps {
	data: Visitor[];
	className?: string;
}

function formatTimeAgo(dateStr: string): string {
	const date = new Date(dateStr);
	const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

	if (seconds < 60) return "just now";
	if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
	if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
	return `${Math.floor(seconds / 86400)}d ago`;
}

function getFlagEmoji(countryCode: string): string {
	if (!countryCode || countryCode.length !== 2) return "";
	const codePoints = countryCode
		.toUpperCase()
		.split("")
		.map((char) => 127397 + char.charCodeAt(0));
	return String.fromCodePoint(...codePoints);
}

const deviceIcons: Record<string, string> = {
	desktop: "D",
	mobile: "M",
	tablet: "T",
	bot: "B",
};

export function VisitorsTable({ data, className }: VisitorsTableProps) {
	const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);

	if (!data || data.length === 0) {
		return (
			<div className={cn("bg-card border border-border rounded-sm", className)}>
				<div className="px-3 py-2 border-b border-border">
					<h3 className="text-xs font-medium text-foreground">Recent Visitors</h3>
				</div>
				<div className="p-6 text-center">
					<Inbox className="h-6 w-6 text-muted-foreground/50 mx-auto mb-2" />
					<p className="text-[11px] text-muted-foreground">No visitors yet</p>
				</div>
			</div>
		);
	}

	return (
		<div className={cn("bg-card border border-border rounded-sm", className)}>
			<div className="px-3 py-2 border-b border-border flex items-center justify-between">
				<h3 className="text-xs font-medium text-foreground">Recent Visitors</h3>
				<span className="text-[10px] text-muted-foreground">{data.length} visitors</span>
			</div>
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
						{data.slice(0, 20).map((visitor) => (
							<tr
								key={visitor.id}
								className={cn(
									"hover:bg-muted/50 transition-colors cursor-pointer",
									selectedVisitor?.id === visitor.id && "bg-muted/70",
								)}
								onClick={() =>
									setSelectedVisitor(selectedVisitor?.id === visitor.id ? null : visitor)
								}
							>
								<td className="px-3 py-1.5">
									<div className="flex items-center gap-2">
										<div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
											<User className="h-3 w-3 text-muted-foreground" />
										</div>
										<span className="font-mono text-[9px] text-muted-foreground">
											{visitor.fingerprint?.slice(0, 8) || visitor.id.slice(0, 8)}
										</span>
									</div>
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

			{/* Visitor Detail Panel */}
			{selectedVisitor && (
				<div className="border-t border-border p-3 bg-muted/30">
					<div className="flex items-center justify-between mb-2">
						<h4 className="text-[10px] font-medium text-foreground uppercase tracking-wide">
							Visitor Details
						</h4>
						<button
							onClick={() => setSelectedVisitor(null)}
							className="text-[10px] text-muted-foreground hover:text-foreground"
						>
							Close
						</button>
					</div>
					<div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px]">
						<div className="flex items-center gap-1.5">
							<Monitor className="h-3 w-3 text-muted-foreground" />
							<span className="text-muted-foreground">Device:</span>
							<span className="text-foreground">{selectedVisitor.deviceType || "Unknown"}</span>
						</div>
						<div className="flex items-center gap-1.5">
							<Globe className="h-3 w-3 text-muted-foreground" />
							<span className="text-muted-foreground">Browser:</span>
							<span className="text-foreground">
								{selectedVisitor.browser} {selectedVisitor.browserVersion}
							</span>
						</div>
						<div className="flex items-center gap-1.5">
							<span className="text-muted-foreground">OS:</span>
							<span className="text-foreground">
								{selectedVisitor.os} {selectedVisitor.osVersion}
							</span>
						</div>
						<div className="flex items-center gap-1.5">
							<span className="text-muted-foreground">Screen:</span>
							<span className="text-foreground">
								{selectedVisitor.screenResolution || "Unknown"}
							</span>
						</div>
						<div className="flex items-center gap-1.5">
							<span className="text-muted-foreground">Language:</span>
							<span className="text-foreground">{selectedVisitor.language || "Unknown"}</span>
						</div>
						<div className="flex items-center gap-1.5">
							<Clock className="h-3 w-3 text-muted-foreground" />
							<span className="text-muted-foreground">First seen:</span>
							<span className="text-foreground">{formatTimeAgo(selectedVisitor.firstSeen)}</span>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
