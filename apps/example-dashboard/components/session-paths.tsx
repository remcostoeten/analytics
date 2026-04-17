"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Route, ArrowRight } from "lucide-react";

interface PathData {
	path: string;
	count: number;
	percentage: number;
}

interface SessionPathsProps {
	data: PathData[] | null;
}

export function SessionPaths({ data }: SessionPathsProps) {
	if (!data || data.length === 0) {
		return (
			<Card className="border-border/50">
				<CardHeader className="py-3 px-4">
					<CardTitle className="text-sm font-medium flex items-center gap-2">
						<Route className="h-4 w-4 text-blue-500" />
						Top User Paths
					</CardTitle>
				</CardHeader>
				<CardContent className="p-6">
					<div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
						No path data available
					</div>
				</CardContent>
			</Card>
		);
	}

	const maxCount = Math.max(...data.map((d) => d.count));

	return (
		<Card className="border-border/50">
			<CardHeader className="py-3 px-4">
				<CardTitle className="text-sm font-medium flex items-center gap-2">
					<Route className="h-4 w-4 text-blue-500" />
					Top User Paths
				</CardTitle>
			</CardHeader>
			<CardContent className="p-4 pt-0">
				<div className="space-y-3">
					{data.slice(0, 10).map((item, index) => {
						const segments = item.path.split(" → ");
						const barWidth = maxCount > 0 ? (item.count / maxCount) * 100 : 0;

						return (
							<div key={index} className="space-y-1">
								<div className="flex items-center gap-2 text-xs">
									{segments.map((segment, i) => (
										<span key={i} className="flex items-center gap-1">
											<span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded font-mono">
												{segment}
											</span>
											{i < segments.length - 1 && (
												<ArrowRight className="h-3 w-3 text-muted-foreground" />
											)}
										</span>
									))}
								</div>
								<div className="flex items-center gap-2">
									<div className="flex-1 h-1.5 bg-muted/30 rounded-full overflow-hidden">
										<div
											className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"
											style={{ width: `${barWidth}%` }}
										/>
									</div>
									<span className="text-xs text-muted-foreground w-16 text-right">
										{item.count} ({item.percentage}%)
									</span>
								</div>
							</div>
						);
					})}
				</div>
			</CardContent>
		</Card>
	);
}
