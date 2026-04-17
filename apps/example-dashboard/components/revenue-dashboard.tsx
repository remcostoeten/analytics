"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, ShoppingCart, Users, TrendingUp } from "lucide-react";
import {
	AreaChart,
	Area,
	XAxis,
	YAxis,
	Tooltip,
	ResponsiveContainer,
	BarChart,
	Bar,
} from "recharts";

interface RevenueData {
	totalRevenue: number;
	transactionCount: number;
	customers: number;
	avgOrderValue: number;
	trend: { date: string; revenue: number; orders: number }[];
	topProducts: { product: string; revenue: number; quantity: number }[];
	bySource: { source: string; revenue: number; orders: number }[];
}

interface RevenueDashboardProps {
	data: RevenueData | null;
}

function formatCurrency(value: number): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(value);
}

export function RevenueDashboard({ data }: RevenueDashboardProps) {
	if (!data) {
		return (
			<Card className="border-border/50">
				<CardContent className="p-6">
					<div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
						Loading revenue data...
					</div>
				</CardContent>
			</Card>
		);
	}

	const kpis = [
		{
			label: "Total Revenue",
			value: formatCurrency(data.totalRevenue),
			icon: DollarSign,
			color: "text-emerald-500",
		},
		{
			label: "Orders",
			value: data.transactionCount.toLocaleString(),
			icon: ShoppingCart,
			color: "text-blue-500",
		},
		{
			label: "Customers",
			value: data.customers.toLocaleString(),
			icon: Users,
			color: "text-violet-500",
		},
		{
			label: "Avg. Order",
			value: formatCurrency(data.avgOrderValue),
			icon: TrendingUp,
			color: "text-amber-500",
		},
	];

	return (
		<div className="space-y-3">
			{/* Revenue KPIs */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
				{kpis.map((kpi) => (
					<Card key={kpi.label} className="border-border/50 bg-card/50">
						<CardContent className="p-4">
							<div className="flex items-center gap-2">
								<div className={`p-2 rounded-lg bg-muted/50 ${kpi.color}`}>
									<kpi.icon className="h-4 w-4" />
								</div>
								<div>
									<p className="text-[10px] text-muted-foreground uppercase tracking-wider">
										{kpi.label}
									</p>
									<p className="text-lg font-semibold text-foreground">{kpi.value}</p>
								</div>
							</div>
						</CardContent>
					</Card>
				))}
			</div>

			{/* Revenue Trend Chart */}
			<Card className="border-border/50">
				<CardHeader className="py-3 px-4">
					<CardTitle className="text-sm font-medium">Revenue Over Time</CardTitle>
				</CardHeader>
				<CardContent className="p-4 pt-0">
					<div className="h-48">
						<ResponsiveContainer width="100%" height="100%">
							<AreaChart data={data.trend}>
								<defs>
									<linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
										<stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
										<stop offset="95%" stopColor="#10b981" stopOpacity={0} />
									</linearGradient>
								</defs>
								<XAxis
									dataKey="date"
									tickFormatter={(v) =>
										new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })
									}
									tick={{ fill: "#888", fontSize: 10 }}
									axisLine={false}
									tickLine={false}
								/>
								<YAxis
									tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
									tick={{ fill: "#888", fontSize: 10 }}
									axisLine={false}
									tickLine={false}
								/>
								<Tooltip
									contentStyle={{
										backgroundColor: "hsl(var(--card))",
										border: "1px solid hsl(var(--border))",
										borderRadius: "8px",
										fontSize: "12px",
									}}
									formatter={(value: number) => [formatCurrency(value), "Revenue"]}
									labelFormatter={(v) => new Date(v).toLocaleDateString()}
								/>
								<Area
									type="monotone"
									dataKey="revenue"
									stroke="#10b981"
									strokeWidth={2}
									fill="url(#revenueGradient)"
								/>
							</AreaChart>
						</ResponsiveContainer>
					</div>
				</CardContent>
			</Card>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
				{/* Top Products */}
				<Card className="border-border/50">
					<CardHeader className="py-3 px-4">
						<CardTitle className="text-sm font-medium">Top Products</CardTitle>
					</CardHeader>
					<CardContent className="p-4 pt-0">
						<div className="h-48">
							<ResponsiveContainer width="100%" height="100%">
								<BarChart data={data.topProducts.slice(0, 5)} layout="vertical">
									<XAxis
										type="number"
										tickFormatter={(v) => `$${v}`}
										tick={{ fill: "#888", fontSize: 10 }}
									/>
									<YAxis
										type="category"
										dataKey="product"
										width={80}
										tick={{ fill: "#888", fontSize: 10 }}
										tickFormatter={(v) => (v.length > 12 ? v.slice(0, 12) + "..." : v)}
									/>
									<Tooltip
										contentStyle={{
											backgroundColor: "hsl(var(--card))",
											border: "1px solid hsl(var(--border))",
											borderRadius: "8px",
											fontSize: "12px",
										}}
										formatter={(value: number) => [formatCurrency(value), "Revenue"]}
									/>
									<Bar dataKey="revenue" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
								</BarChart>
							</ResponsiveContainer>
						</div>
					</CardContent>
				</Card>

				{/* Revenue by Source */}
				<Card className="border-border/50">
					<CardHeader className="py-3 px-4">
						<CardTitle className="text-sm font-medium">Revenue by Source</CardTitle>
					</CardHeader>
					<CardContent className="p-4 pt-0">
						<div className="space-y-2">
							{data.bySource.slice(0, 6).map((source) => {
								const maxRevenue = Math.max(...data.bySource.map((s) => s.revenue));
								const width = maxRevenue > 0 ? (source.revenue / maxRevenue) * 100 : 0;
								return (
									<div key={source.source} className="flex items-center gap-3">
										<div className="w-20 text-xs text-muted-foreground truncate">
											{source.source}
										</div>
										<div className="flex-1 h-6 bg-muted/30 rounded-full overflow-hidden">
											<div
												className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all"
												style={{ width: `${width}%` }}
											/>
										</div>
										<div className="w-20 text-right text-xs font-medium">
											{formatCurrency(source.revenue)}
										</div>
									</div>
								);
							})}
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
