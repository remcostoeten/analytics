import { sql } from "../db";
import { publicTraffic, NUMERIC_PATTERN } from "./filters";

const TRANSACTION_EVENT_NAMES = ["transaction", "purchase", "conversion"];

export type CurrencyTotal = {
	currency: string;
	revenue: number;
	transactions: number;
	orders: number;
	items: number;
	buyers: number;
	averageOrderValue: number;
};

export type RecentOrder = {
	orderId: string | null;
	revenue: number;
	currency: string;
	items: number | null;
	path: string | null;
	ts: string;
};

export type RevenueStats = {
	transactions: number;
	buyers: number;
	currencies: CurrencyTotal[];
	recentOrders: RecentOrder[];
};

/**
 * Revenue is reported per currency rather than as one total. `trackTransaction`
 * takes a currency argument, so summing the raw `meta.revenue` across rows adds
 * unlike units together — 49 USD and 49 JPY are not 98 of anything.
 */
export async function getRevenueStats(
	from: Date,
	to: Date,
	projectId: string | null,
	excludeVisitorId?: string | null,
	origin?: string | null,
): Promise<RevenueStats> {
	const base = sql`type = 'event'
		AND meta->>'eventName' = ANY(${TRANSACTION_EVENT_NAMES})
		AND ${publicTraffic(excludeVisitorId, origin)}
		AND (bot_detected = false OR bot_detected IS NULL)
		AND ts >= ${from} AND ts <= ${to}
		${projectId ? sql`AND project_id = ${projectId}` : sql``}`;

	const [totalRows, currencyRows, orderRows] = await Promise.all([
		sql`SELECT COUNT(*) as transactions, COUNT(DISTINCT visitor_id) as buyers
			FROM events WHERE ${base}`,
		sql`SELECT
				COALESCE(NULLIF(meta->>'currency', ''), 'USD') as currency,
				COALESCE(SUM(CAST(meta->>'revenue' AS numeric))
					FILTER (WHERE meta->>'revenue' ~ ${NUMERIC_PATTERN}), 0) as revenue,
				COUNT(*) as transactions,
				COUNT(DISTINCT meta->>'orderId') FILTER (WHERE meta->>'orderId' IS NOT NULL) as orders,
				COALESCE(SUM(CAST(meta->>'items' AS numeric))
					FILTER (WHERE meta->>'items' ~ ${NUMERIC_PATTERN}), 0) as items,
				COUNT(DISTINCT visitor_id) as buyers
			FROM events WHERE ${base}
			GROUP BY 1
			ORDER BY revenue DESC`,
		sql`SELECT
				meta->>'orderId' as order_id,
				COALESCE(NULLIF(meta->>'currency', ''), 'USD') as currency,
				CASE WHEN meta->>'revenue' ~ ${NUMERIC_PATTERN}
					THEN CAST(meta->>'revenue' AS numeric) ELSE 0 END as revenue,
				CASE WHEN meta->>'items' ~ ${NUMERIC_PATTERN}
					THEN CAST(meta->>'items' AS numeric) ELSE NULL END as items,
				path,
				ts
			FROM events WHERE ${base}
			ORDER BY ts DESC
			LIMIT 10`,
	]);

	const totals = totalRows[0];

	return {
		transactions: Number(totals?.transactions ?? 0),
		buyers: Number(totals?.buyers ?? 0),
		currencies: currencyRows.map(function (row) {
			const revenue = Number(row.revenue);
			const orders = Number(row.orders);
			const transactions = Number(row.transactions);
			const divisor = orders > 0 ? orders : transactions;
			return {
				currency: row.currency as string,
				revenue,
				transactions,
				orders,
				items: Number(row.items),
				buyers: Number(row.buyers),
				averageOrderValue: divisor > 0 ? revenue / divisor : 0,
			};
		}),
		recentOrders: orderRows.map(function (row) {
			return {
				orderId: (row.order_id as string) || null,
				revenue: Number(row.revenue),
				currency: row.currency as string,
				items: row.items === null ? null : Number(row.items),
				path: (row.path as string) || null,
				ts: new Date(row.ts as string).toISOString(),
			};
		}),
	};
}
