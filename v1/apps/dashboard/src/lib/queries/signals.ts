import { sql } from "../db";
import { publicTraffic } from "./filters";
import { toCountryCode, countryName, countryFromTimezone, regionName } from "../geo-names";

export type GeoSignal = {
	kind:
		| "vpn-suspect"
		| "datacenter-traffic"
		| "outlier-visitor"
		| "new-country"
		| "regional-spike"
		| "zero-engagement";
	severity: "high" | "medium" | "info";
	title: string;
	description: string;
	href: string;
	count: number;
};

const SEVERITY_ORDER: Record<GeoSignal["severity"], number> = { high: 0, medium: 1, info: 2 };
const DATACENTER_PATTERN = "amazon|google cloud|microsoft|hetzner|digitalocean|ovh|vultr|linode";
const DAY_MS = 86_400_000;

function shortId(visitorId: string): string {
	return visitorId.slice(0, 12);
}

export async function getGeoSignals(
	from: Date,
	to: Date,
	projectId: string | null,
	excludeVisitorId?: string | null,
	origin?: string | null,
): Promise<GeoSignal[]> {
	const base = sql`${publicTraffic(excludeVisitorId, origin)} AND ts >= ${from} AND ts <= ${to} ${projectId ? sql`AND project_id = ${projectId}` : sql``}`;
	const rangeDays = (to.getTime() - from.getTime()) / DAY_MS;

	const [timezoneRows, datacenterRows, outlierRows, firstCountryRows, spikeRows, deadSessionRows] =
		await Promise.all([
			sql`SELECT visitor_id, mode() WITHIN GROUP (ORDER BY timezone) as timezone, mode() WITHIN GROUP (ORDER BY country) as country, COUNT(*) as events FROM events WHERE ${base} AND visitor_id IS NOT NULL AND timezone IS NOT NULL AND timezone != '' AND country IS NOT NULL AND country != '' GROUP BY visitor_id ORDER BY events DESC LIMIT 500`,
			sql`SELECT visitor_id, mode() WITHIN GROUP (ORDER BY as_org) as as_org, COUNT(*) as events FROM events WHERE ${base} AND visitor_id IS NOT NULL AND as_org ~* ${DATACENTER_PATTERN} AND (bot_detected = false OR bot_detected IS NULL) GROUP BY visitor_id ORDER BY events DESC LIMIT 5`,
			sql`WITH per_visitor AS (SELECT visitor_id, COUNT(*) as events FROM events WHERE ${base} AND visitor_id IS NOT NULL GROUP BY visitor_id), med AS (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY events) as m FROM per_visitor) SELECT visitor_id, events, med.m as median FROM per_visitor, med WHERE med.m > 0 AND events > 10 * med.m ORDER BY events DESC LIMIT 5`,
			sql`SELECT country, MIN(ts) as first_ts FROM events WHERE ${publicTraffic(excludeVisitorId, origin)} AND country IS NOT NULL AND country != '' ${projectId ? sql`AND project_id = ${projectId}` : sql``} GROUP BY country`,
			rangeDays >= 7
				? sql`SELECT country, region, COUNT(*) FILTER (WHERE ts > now() - interval '24 hours') as recent, COUNT(*) FILTER (WHERE ts <= now() - interval '24 hours' AND ts > now() - interval '8 days') as trailing FROM events WHERE ${base} AND region IS NOT NULL AND region != '' AND country IS NOT NULL GROUP BY country, region`
				: Promise.resolve([]),
			sql`SELECT session_id, mode() WITHIN GROUP (ORDER BY visitor_id) as visitor_id, COUNT(*) FILTER (WHERE type = 'pageview') as pageviews FROM events WHERE ${base} AND session_id IS NOT NULL GROUP BY session_id HAVING COUNT(*) FILTER (WHERE type = 'pageview') >= 5 AND COUNT(*) FILTER (WHERE meta->>'eventName' IN ('scroll', 'time-on-page')) = 0 ORDER BY pageviews DESC LIMIT 5`,
		]);

	const signals: GeoSignal[] = [];

	let vpnCount = 0;
	for (const row of timezoneRows) {
		const implied = countryFromTimezone(row.timezone as string);
		const ipCountry = toCountryCode(row.country as string);
		if (!implied || !ipCountry || implied === ipCountry) continue;
		if (vpnCount < 5) {
			signals.push({
				kind: "vpn-suspect",
				severity: "medium",
				title: `Timezone contradicts IP for ${shortId(row.visitor_id as string)}`,
				description: `Browser timezone ${(row.timezone as string).replace(/_/g, " ")} implies ${countryName(implied)}, but the IP resolves to ${countryName(ipCountry)} — VPN or proxy likely (${row.events} events).`,
				href: `/visitor/${row.visitor_id}`,
				count: Number(row.events),
			});
		}
		vpnCount++;
	}

	for (const row of datacenterRows) {
		signals.push({
			kind: "datacenter-traffic",
			severity: "high",
			title: `Datacenter traffic from ${row.as_org}`,
			description: `Visitor ${shortId(row.visitor_id as string)} browses from ${row.as_org} infrastructure but wasn't flagged as a bot (${row.events} events).`,
			href: `/visitor/${row.visitor_id}`,
			count: Number(row.events),
		});
	}

	for (const row of outlierRows) {
		signals.push({
			kind: "outlier-visitor",
			severity: "medium",
			title: `Outlier activity from ${shortId(row.visitor_id as string)}`,
			description: `${row.events} events in range — more than 10× the median visitor (${Math.round(Number(row.median))}).`,
			href: `/visitor/${row.visitor_id}`,
			count: Number(row.events),
		});
	}

	const firstSeenByCode = new Map<string, number>();
	for (const row of firstCountryRows) {
		const code = toCountryCode(row.country as string);
		if (!code) continue;
		const ts = new Date(row.first_ts as string).getTime();
		const existing = firstSeenByCode.get(code);
		if (existing === undefined || ts < existing) firstSeenByCode.set(code, ts);
	}
	const newCountries = [...firstSeenByCode.entries()]
		.filter(([, ts]) => ts >= from.getTime() && ts <= to.getTime())
		.sort((a, b) => b[1] - a[1])
		.slice(0, 8);
	for (const [code, ts] of newCountries) {
		signals.push({
			kind: "new-country",
			severity: "info",
			title: `First-ever visit from ${countryName(code)}`,
			description: `The first event from ${countryName(code)} arrived ${new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" })}.`,
			href: `/geo?country=${code}`,
			count: 1,
		});
	}

	for (const row of spikeRows) {
		const recent = Number(row.recent);
		const dailyAvg = Number(row.trailing) / 7;
		if (recent < 10 || dailyAvg <= 0 || recent <= 3 * dailyAvg) continue;
		const code = toCountryCode(row.country as string);
		if (!code) continue;
		signals.push({
			kind: "regional-spike",
			severity: "high",
			title: `Traffic spike in ${regionName(code, row.region as string)}`,
			description: `${recent} events in the last 24h vs a ${Math.round(dailyAvg)}/day trailing average (${Math.round(recent / dailyAvg)}× normal).`,
			href: `/geo?country=${code}&region=${encodeURIComponent(row.region as string)}`,
			count: recent,
		});
	}

	for (const row of deadSessionRows) {
		if (!row.visitor_id) continue;
		signals.push({
			kind: "zero-engagement",
			severity: "medium",
			title: `Zero-engagement session from ${shortId(row.visitor_id as string)}`,
			description: `${row.pageviews} pageviews with no scroll or time-on-page events — likely a crawler or an SDK gap.`,
			href: `/visitor/${row.visitor_id}`,
			count: Number(row.pageviews),
		});
	}

	return signals.sort(
		(a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || b.count - a.count,
	);
}
