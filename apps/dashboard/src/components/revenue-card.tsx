"use client";

import { CreditCard } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";
import type { RevenueStats } from "@/lib/queries/revenue";

type Props = {
	data: RevenueStats | null | undefined;
	className?: string;
};

function formatMoney(value: number, currency: string): string {
	try {
		return new Intl.NumberFormat(undefined, {
			style: "currency",
			currency,
			maximumFractionDigits: value % 1 === 0 ? 0 : 2,
		}).format(value);
	} catch {
		return `${value.toLocaleString()} ${currency}`;
	}
}

export function RevenueCard({ data, className }: Props) {
	if (!data) {
		return (
			<div className={cn("rounded-lg border border-border bg-card", className)}>
				<div className="px-3 py-2 border-b border-border">
					<h3 className="text-xs font-medium text-foreground">Revenue</h3>
				</div>
				<div className="p-3 space-y-2">
					{[0, 1].map((i) => (
						<div key={i} className="flex items-center justify-between px-1">
							<Skeleton className="h-3 w-16" />
							<Skeleton className="h-3 w-20" />
						</div>
					))}
				</div>
			</div>
		);
	}

	if (data.transactions === 0) {
		return (
			<div className={cn("rounded-lg border border-border bg-card", className)}>
				<div className="px-3 py-2 border-b border-border">
					<h3 className="text-xs font-medium text-foreground">Revenue</h3>
				</div>
				<div className="p-6 text-center space-y-1">
					<CreditCard className="h-6 w-6 text-muted-foreground/40 mx-auto mb-2" />
					<p className="text-xs text-muted-foreground">No transactions in this period</p>
					<p className="text-[11px] text-muted-foreground/70">
						Call{" "}
						<span className="font-mono">trackTransaction(revenue, currency, orderId, items)</span>{" "}
						to record one.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className={cn("rounded-lg border border-border bg-card", className)}>
			<div className="px-3 py-2 border-b border-border flex items-center justify-between">
				<div className="flex items-center gap-1.5">
					<CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
					<h3 className="text-xs font-medium text-foreground">Revenue</h3>
				</div>
				<span className="text-[11px] text-muted-foreground tabular-nums">
					{formatNumber(data.transactions)} txns · {formatNumber(data.buyers)} buyers
				</span>
			</div>

			<div className="divide-y divide-border/60">
				{data.currencies.map((entry) => (
					<div key={entry.currency} className="px-3 py-2">
						<div className="flex items-baseline justify-between gap-2">
							<span className="text-sm font-semibold tabular-nums text-foreground">
								{formatMoney(entry.revenue, entry.currency)}
							</span>
							<span className="text-[10px] uppercase tracking-wide text-muted-foreground">
								{entry.currency}
							</span>
						</div>
						<div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground tabular-nums">
							<span>
								{formatNumber(entry.orders || entry.transactions)}{" "}
								{entry.orders ? "orders" : "txns"}
							</span>
							<span>·</span>
							<span>AOV {formatMoney(entry.averageOrderValue, entry.currency)}</span>
							{entry.items > 0 && (
								<>
									<span>·</span>
									<span>{formatNumber(entry.items)} items</span>
								</>
							)}
						</div>
					</div>
				))}
			</div>

			{data.recentOrders.length > 0 && (
				<div className="border-t border-border divide-y divide-border/40">
					<div className="px-3 py-1.5">
						<span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
							Recent Orders
						</span>
					</div>
					{data.recentOrders.map((order, i) => (
						<div
							key={`${order.orderId ?? "anon"}-${i}`}
							className="flex items-center gap-2 px-3 py-1.5"
						>
							<span className="flex-1 truncate font-mono text-[11px] text-foreground">
								{order.orderId ?? "no order id"}
							</span>
							{order.items !== null && (
								<span className="shrink-0 text-[10px] text-muted-foreground">×{order.items}</span>
							)}
							<span className="shrink-0 tabular-nums text-[11px] text-muted-foreground">
								{formatMoney(order.revenue, order.currency)}
							</span>
						</div>
					))}
				</div>
			)}

			{data.currencies.length > 1 && (
				<div className="px-3 py-1.5 border-t border-border">
					<p className="text-[10px] text-muted-foreground/70">
						Totals are kept per currency — no conversion rates are applied.
					</p>
				</div>
			)}
		</div>
	);
}
