"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Crown, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface SegmentData {
	segment: string;
	events: number;
	pageviews: number;
	visitors: number;
	sessions: number;
	revenue: number;
	signups: number;
	avgTimeOnPage: number;
	planDistribution: { plan: string; visitors: number }[];
}

interface UserSegmentationProps {
	data: SegmentData | null;
	onSegmentChange?: (segment: string) => void;
}

export function UserSegmentation({ data, onSegmentChange }: UserSegmentationProps) {
	const [activeSegment, setActiveSegment] = useState<string>("all");

	const segments = [
		{ id: "all", label: "All Users", icon: Users, color: "text-blue-500" },
		{ id: "pro", label: "Pro Users", icon: Crown, color: "text-amber-500" },
		{ id: "free", label: "Free Users", icon: UserCheck, color: "text-emerald-500" },
	];

	const handleSegmentChange = (segment: string) => {
		setActiveSegment(segment);
		onSegmentChange?.(segment);
	};

	return (
		<Card className="border-border/50">
			<CardHeader className="py-3 px-4">
				<CardTitle className="text-sm font-medium flex items-center gap-2">
					<Users className="h-4 w-4 text-violet-500" />
					User Segmentation
				</CardTitle>
			</CardHeader>
			<CardContent className="p-4 pt-0">
				{/* Segment Tabs */}
				<div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg mb-4">
					{segments.map((segment) => (
						<button
							key={segment.id}
							onClick={() => handleSegmentChange(segment.id)}
							className={cn(
								"flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md transition-all",
								activeSegment === segment.id
									? "bg-background text-foreground shadow-sm"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							<segment.icon className={cn("h-3.5 w-3.5", segment.color)} />
							{segment.label}
						</button>
					))}
				</div>

				{/* Segment Stats */}
				{data ? (
					<div className="space-y-4">
						{/* Main Stats Grid */}
						<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
							<div className="p-3 rounded-lg bg-muted/30 text-center">
								<p className="text-lg font-bold text-foreground">
									{data.visitors.toLocaleString()}
								</p>
								<p className="text-xs text-muted-foreground">Visitors</p>
							</div>
							<div className="p-3 rounded-lg bg-muted/30 text-center">
								<p className="text-lg font-bold text-foreground">
									{data.pageviews.toLocaleString()}
								</p>
								<p className="text-xs text-muted-foreground">Pageviews</p>
							</div>
							<div className="p-3 rounded-lg bg-muted/30 text-center">
								<p className="text-lg font-bold text-emerald-500">
									${data.revenue.toLocaleString()}
								</p>
								<p className="text-xs text-muted-foreground">Revenue</p>
							</div>
							<div className="p-3 rounded-lg bg-muted/30 text-center">
								<p className="text-lg font-bold text-foreground">{data.signups}</p>
								<p className="text-xs text-muted-foreground">Signups</p>
							</div>
						</div>

						{/* Plan Distribution */}
						{data.planDistribution && data.planDistribution.length > 0 && (
							<div>
								<h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
									Plan Distribution
								</h4>
								<div className="space-y-2">
									{data.planDistribution.map((plan) => {
										const total = data.planDistribution.reduce((s, p) => s + p.visitors, 0);
										const percentage = total > 0 ? (plan.visitors / total) * 100 : 0;
										const color =
											plan.plan === "pro"
												? "bg-amber-500"
												: plan.plan === "free"
													? "bg-emerald-500"
													: "bg-blue-500";

										return (
											<div key={plan.plan} className="flex items-center gap-2">
												<span className="w-16 text-xs text-muted-foreground capitalize">
													{plan.plan}
												</span>
												<div className="flex-1 h-2 bg-muted/30 rounded-full overflow-hidden">
													<div
														className={cn("h-full rounded-full", color)}
														style={{ width: `${percentage}%` }}
													/>
												</div>
												<span className="w-20 text-xs text-right text-muted-foreground">
													{plan.visitors} ({Math.round(percentage)}%)
												</span>
											</div>
										);
									})}
								</div>
							</div>
						)}

						{/* Avg Time */}
						<div className="pt-3 border-t border-border/50 flex items-center justify-between text-sm">
							<span className="text-muted-foreground">Avg. Time on Page</span>
							<span className="font-medium">
								{data.avgTimeOnPage > 0 ? `${Math.round(data.avgTimeOnPage / 1000)}s` : "N/A"}
							</span>
						</div>
					</div>
				) : (
					<div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
						Loading segment data...
					</div>
				)}
			</CardContent>
		</Card>
	);
}
