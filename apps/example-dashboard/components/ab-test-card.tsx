"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FlaskConical, Trophy, TrendingUp, Users, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

interface Variant {
	name: string;
	visitors: number;
	sessions: number;
	conversions: number;
	conversionRate: number;
	revenue: number;
	orders: number;
}

interface ExperimentData {
	experimentName: string;
	variants: Variant[];
	winner: string | null;
}

interface ABTestCardProps {
	data: ExperimentData | null;
}

export function ABTestCard({ data }: ABTestCardProps) {
	if (!data || !data.variants || data.variants.length === 0) {
		return (
			<Card className="border-border/50">
				<CardHeader className="py-3 px-4">
					<CardTitle className="text-sm font-medium flex items-center gap-2">
						<FlaskConical className="h-4 w-4 text-amber-500" />
						A/B Tests
					</CardTitle>
				</CardHeader>
				<CardContent className="p-6">
					<div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
						No active experiments
					</div>
				</CardContent>
			</Card>
		);
	}

	const maxConversion = Math.max(...data.variants.map((v) => v.conversionRate));

	return (
		<Card className="border-border/50">
			<CardHeader className="py-3 px-4">
				<div className="flex items-center justify-between">
					<CardTitle className="text-sm font-medium flex items-center gap-2">
						<FlaskConical className="h-4 w-4 text-amber-500" />
						{data.experimentName}
					</CardTitle>
					{data.winner && (
						<div className="flex items-center gap-1 text-xs text-amber-500">
							<Trophy className="h-3 w-3" />
							<span className="font-medium capitalize">{data.winner} wins</span>
						</div>
					)}
				</div>
			</CardHeader>
			<CardContent className="p-4 pt-0">
				<div className="space-y-4">
					{data.variants.map((variant) => {
						const isWinner = variant.name === data.winner;
						const barWidth = maxConversion > 0 ? (variant.conversionRate / maxConversion) * 100 : 0;

						return (
							<div
								key={variant.name}
								className={cn(
									"p-3 rounded-lg border transition-all",
									isWinner ? "border-amber-500/50 bg-amber-500/5" : "border-border/50 bg-muted/20",
								)}
							>
								<div className="flex items-center justify-between mb-3">
									<div className="flex items-center gap-2">
										<div
											className={cn(
												"w-4 h-4 rounded-full",
												variant.name === "red"
													? "bg-rose-500"
													: variant.name === "green"
														? "bg-emerald-500"
														: variant.name === "blue"
															? "bg-blue-500"
															: "bg-violet-500",
											)}
										/>
										<span className="font-medium capitalize text-foreground">{variant.name}</span>
										{isWinner && <Trophy className="h-4 w-4 text-amber-500" />}
									</div>
									<span className="text-lg font-bold text-foreground">
										{variant.conversionRate}%
									</span>
								</div>

								{/* Conversion bar */}
								<div className="h-2 bg-muted/50 rounded-full overflow-hidden mb-3">
									<div
										className={cn(
											"h-full rounded-full transition-all duration-500",
											variant.name === "red"
												? "bg-rose-500"
												: variant.name === "green"
													? "bg-emerald-500"
													: variant.name === "blue"
														? "bg-blue-500"
														: "bg-violet-500",
										)}
										style={{ width: `${barWidth}%` }}
									/>
								</div>

								{/* Stats */}
								<div className="grid grid-cols-4 gap-2 text-xs">
									<div className="flex items-center gap-1 text-muted-foreground">
										<Users className="h-3 w-3" />
										<span>{variant.visitors.toLocaleString()}</span>
									</div>
									<div className="flex items-center gap-1 text-muted-foreground">
										<TrendingUp className="h-3 w-3" />
										<span>{variant.conversions}</span>
									</div>
									<div className="flex items-center gap-1 text-muted-foreground">
										<DollarSign className="h-3 w-3" />
										<span>${variant.revenue.toLocaleString()}</span>
									</div>
									<div className="text-right text-muted-foreground">{variant.orders} orders</div>
								</div>
							</div>
						);
					})}
				</div>

				{/* Statistical significance hint */}
				<div className="mt-4 pt-3 border-t border-border/50 text-center">
					<p className="text-xs text-muted-foreground">
						{data.variants.reduce((s, v) => s + v.visitors, 0) >= 1000
							? "Statistically significant results"
							: "Gathering more data for significance"}
					</p>
				</div>
			</CardContent>
		</Card>
	);
}
