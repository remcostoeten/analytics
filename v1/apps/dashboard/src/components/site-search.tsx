"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, AlertCircle, MousePointerClick } from "lucide-react";

interface SearchQuery {
	query: string;
	count: number;
	users: number;
	avgResults: number;
}

interface SearchData {
	totalSearches: number;
	clickThroughRate: number;
	topQueries: SearchQuery[];
	zeroResultQueries: { query: string; count: number }[];
}

interface SiteSearchProps {
	data: SearchData | null;
}

export function SiteSearch({ data }: SiteSearchProps) {
	if (!data) {
		return (
			<Card className="border-border/50">
				<CardHeader className="py-3 px-4">
					<CardTitle className="text-sm font-medium flex items-center gap-2">
						<Search className="h-4 w-4 text-violet-500" />
						Site Search
					</CardTitle>
				</CardHeader>
				<CardContent className="p-6">
					<div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
						No search data available
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-3">
			{/* Search Stats */}
			<div className="grid grid-cols-2 gap-3">
				<Card className="border-border/50">
					<CardContent className="p-4">
						<div className="flex items-center gap-2">
							<Search className="h-5 w-5 text-violet-500" />
							<div>
								<p className="text-2xl font-bold text-foreground">
									{data.totalSearches.toLocaleString()}
								</p>
								<p className="text-xs text-muted-foreground">Total Searches</p>
							</div>
						</div>
					</CardContent>
				</Card>
				<Card className="border-border/50">
					<CardContent className="p-4">
						<div className="flex items-center gap-2">
							<MousePointerClick className="h-5 w-5 text-emerald-500" />
							<div>
								<p className="text-2xl font-bold text-foreground">{data.clickThroughRate}%</p>
								<p className="text-xs text-muted-foreground">Click-through Rate</p>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Top Queries */}
			<Card className="border-border/50">
				<CardHeader className="py-3 px-4">
					<CardTitle className="text-sm font-medium">Top Search Queries</CardTitle>
				</CardHeader>
				<CardContent className="p-4 pt-0">
					{data.topQueries.length === 0 ? (
						<div className="flex items-center justify-center h-20 text-muted-foreground text-sm">
							No search queries yet
						</div>
					) : (
						<div className="space-y-2">
							{data.topQueries.slice(0, 10).map((query) => {
								const maxCount = Math.max(...data.topQueries.map((q) => q.count));
								const width = maxCount > 0 ? (query.count / maxCount) * 100 : 0;

								return (
									<div key={query.query} className="space-y-1">
										<div className="flex items-center justify-between text-sm">
											<span className="text-foreground truncate flex-1 font-mono">
												&quot;{query.query}&quot;
											</span>
											<div className="flex items-center gap-3 text-xs text-muted-foreground ml-2">
												<span>{query.count} searches</span>
												<span>{query.users} users</span>
												<span className="text-violet-400">{query.avgResults} results</span>
											</div>
										</div>
										<div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
											<div
												className="h-full bg-gradient-to-r from-violet-500 to-violet-400 rounded-full"
												style={{ width: `${width}%` }}
											/>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</CardContent>
			</Card>

			{/* Zero Result Queries */}
			{data.zeroResultQueries.length > 0 && (
				<Card className="border-rose-500/30 bg-rose-500/5">
					<CardHeader className="py-3 px-4">
						<CardTitle className="text-sm font-medium flex items-center gap-2">
							<AlertCircle className="h-4 w-4 text-rose-500" />
							Zero Result Queries
						</CardTitle>
					</CardHeader>
					<CardContent className="p-4 pt-0">
						<p className="text-xs text-muted-foreground mb-3">
							These searches returned no results - consider adding content for these terms.
						</p>
						<div className="flex flex-wrap gap-2">
							{data.zeroResultQueries.map((query) => (
								<span
									key={query.query}
									className="inline-flex items-center gap-1 px-2 py-1 bg-rose-500/10 text-rose-400 rounded-full text-xs font-mono"
								>
									&quot;{query.query}&quot;
									<span className="text-rose-300">×{query.count}</span>
								</span>
							))}
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
