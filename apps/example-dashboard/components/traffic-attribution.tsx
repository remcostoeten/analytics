"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Compass, Users, BarChart } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface Channel {
	channel: string;
	visitors: number;
	sessions: number;
	revenue: number;
	conversions: number;
	revenueShare: number;
}

interface AttributionData {
	channels: Channel[];
	totalRevenue: number;
}

interface TrafficAttributionProps {
	data: AttributionData | null;
}

const COLORS = [
	"#10b981",
	"#3b82f6",
	"#8b5cf6",
	"#f59e0b",
	"#ec4899",
	"#6366f1",
	"#14b8a6",
	"#f43f5e",
];

function formatCurrency(value: number): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(value);
}

export function TrafficAttribution({ data }: TrafficAttributionProps) {
	if (!data || !data.channels || data.channels.length === 0) {
		return (
			<Card className="border-border/50">
				<CardHeader className="py-3 px-4">
					<CardTitle className="text-sm font-medium flex items-center gap-2">
						<Compass className="h-4 w-4 text-blue-500" />
						Traffic Attribution
					</CardTitle>
				</CardHeader>
				<CardContent className="p-6">
					<div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
						No attribution data available
					</div>
				</CardContent>
			</Card>
		);
	}

	const pieData = data.channels.map((ch, i) => ({
		name: ch.channel,
		value: ch.revenue,
		color: COLORS[i % COLORS.length],
	}));

	return (
		<Card className="border-border/50">
			<CardHeader className="py-3 px-4">
				<div className="flex items-center justify-between">
					<CardTitle className="text-sm font-medium flex items-center gap-2">
						<Compass className="h-4 w-4 text-blue-500" />
						First-Touch Attribution
					</CardTitle>
					<div className="text-sm font-semibold text-emerald-500">
						{formatCurrency(data.totalRevenue)} total
					</div>
				</div>
			</CardHeader>
			<CardContent className="p-4 pt-0">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{/* Pie Chart */}
					<div className="h-48">
						<ResponsiveContainer width="100%" height="100%">
							<PieChart>
								<Pie
									data={pieData}
									cx="50%"
									cy="50%"
									innerRadius={40}
									outerRadius={70}
									paddingAngle={2}
									dataKey="value"
								>
									{pieData.map((entry, index) => (
										<Cell key={`cell-${index}`} fill={entry.color} />
									))}
								</Pie>
								<Tooltip
									contentStyle={{
										backgroundColor: "hsl(var(--card))",
										border: "1px solid hsl(var(--border))",
										borderRadius: "8px",
										fontSize: "12px",
									}}
									formatter={(value: number) => formatCurrency(value)}
								/>
							</PieChart>
						</ResponsiveContainer>
					</div>

					{/* Channel List */}
					<div className="space-y-2">
						{data.channels.slice(0, 6).map((channel, i) => (
							<div
								key={channel.channel}
								className="flex items-center gap-2 p-2 rounded-lg bg-muted/20"
							>
								<div
									className="w-3 h-3 rounded-full"
									style={{ backgroundColor: COLORS[i % COLORS.length] }}
								/>
								<div className="flex-1 min-w-0">
									<p className="text-sm font-medium text-foreground capitalize truncate">
										{channel.channel}
									</p>
									<div className="flex items-center gap-3 text-xs text-muted-foreground">
										<span className="flex items-center gap-1">
											<Users className="h-3 w-3" />
											{channel.visitors}
										</span>
										<span className="flex items-center gap-1">
											<BarChart className="h-3 w-3" />
											{channel.conversions}
										</span>
									</div>
								</div>
								<div className="text-right">
									<p className="text-sm font-semibold text-emerald-500">
										{formatCurrency(channel.revenue)}
									</p>
									<p className="text-xs text-muted-foreground">{channel.revenueShare}%</p>
								</div>
							</div>
						))}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
