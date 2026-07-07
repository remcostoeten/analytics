import type { PostHogEvent, PostHogInsight, PostHogSite, PostHogSummary } from "./types";

export class PostHogConfigError extends Error {}

type PostHogConfig = {
	apiKey: string;
	projectId: string;
	host: string;
};

export function getPostHogConfig(): PostHogConfig {
	const apiKey = process.env.POSTHOG_API_KEY;
	const projectId = process.env.POSTHOG_PROJECT_ID;
	const host = process.env.POSTHOG_HOST || "https://us.posthog.com";

	if (!apiKey || !projectId) {
		throw new PostHogConfigError(
			"Set POSTHOG_API_KEY and POSTHOG_PROJECT_ID to connect the PostHog tab.",
		);
	}

	return { apiKey, projectId, host: host.replace(/\/$/, "") };
}

async function postHogFetch(config: PostHogConfig, path: string, init?: RequestInit) {
	const response = await fetch(`${config.host}${path}`, {
		...init,
		headers: {
			Authorization: `Bearer ${config.apiKey}`,
			"Content-Type": "application/json",
			...init?.headers,
		},
		cache: "no-store",
	});

	if (!response.ok) {
		const body = await response.text().catch(() => "");
		throw new Error(`PostHog API ${response.status}: ${body.slice(0, 300)}`);
	}

	return response.json();
}

export async function getPostHogInsights(limit: number = 10): Promise<PostHogInsight[]> {
	const config = getPostHogConfig();
	const data = await postHogFetch(
		config,
		`/api/projects/${config.projectId}/insights/?limit=${limit}&order=-last_modified_at`,
	);

	const results: Array<Record<string, unknown>> = data.results ?? [];
	return results.map((r) => {
		const { value, sparkline } = extractInsightResult(r.result);
		return {
			id: String(r.id),
			shortId: String(r.short_id ?? r.id),
			name: (r.name as string) || (r.derived_name as string) || "Untitled insight",
			description: (r.description as string) || null,
			lastRefresh: (r.last_refresh as string) || (r.last_modified_at as string) || null,
			url: `${config.host}/project/${config.projectId}/insights/${r.short_id ?? r.id}`,
			value,
			sparkline,
		};
	});
}

function extractInsightResult(result: unknown): {
	value: number | null;
	sparkline: number[] | null;
} {
	if (!Array.isArray(result) || result.length === 0) {
		return { value: null, sparkline: null };
	}

	const first = result[0] as Record<string, unknown>;
	if (!first || typeof first !== "object") return { value: null, sparkline: null };

	const data = Array.isArray(first.data) ? (first.data as number[]).map(Number) : null;

	if (typeof first.aggregated_value === "number") {
		return { value: first.aggregated_value, sparkline: data };
	}
	if (typeof first.count === "number" && (first.count !== 0 || !data)) {
		return { value: first.count, sparkline: data };
	}
	if (data && data.length > 0) {
		return { value: data[data.length - 1], sparkline: data };
	}
	return { value: null, sparkline: null };
}

export async function getPostHogRecentEvents(limit: number = 25): Promise<PostHogEvent[]> {
	const config = getPostHogConfig();
	const data = await postHogFetch(
		config,
		`/api/projects/${config.projectId}/events/?limit=${limit}&orderBy=${encodeURIComponent('["-timestamp"]')}`,
	);

	const results: Array<Record<string, unknown>> = data.results ?? [];
	return results.map((r) => {
		const properties = (r.properties as Record<string, unknown>) || {};
		return {
			id: String(r.id),
			event: String(r.event),
			timestamp: String(r.timestamp),
			distinctId: String(r.distinct_id ?? ""),
			currentUrl: (properties["$current_url"] as string) || null,
		};
	});
}

async function runHogQL(config: PostHogConfig, query: string): Promise<unknown[][]> {
	const data = await postHogFetch(config, `/api/projects/${config.projectId}/query/`, {
		method: "POST",
		body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
	});
	return data.results ?? [];
}

export async function getPostHogSummary(): Promise<PostHogSummary> {
	const config = getPostHogConfig();

	const [seriesRows, totalsRows, allTimeRows, siteRows] = await Promise.all([
		runHogQL(
			config,
			"SELECT toDate(timestamp) as day, count() as events FROM events WHERE timestamp >= now() - interval 7 day GROUP BY day ORDER BY day",
		),
		runHogQL(
			config,
			`SELECT
				count() as events,
				count(distinct person_id) as persons,
				countIf(event = '$pageview') as pageviews,
				count(distinct properties.$session_id) as sessions,
				count(distinct properties.$geoip_country_code) as countries
			FROM events
			WHERE timestamp >= now() - interval 7 day`,
		),
		runHogQL(config, "SELECT count() as events, count(distinct person_id) as persons FROM events"),
		runHogQL(
			config,
			`SELECT properties.$host as host, count() as events
			FROM events
			WHERE timestamp >= now() - interval 30 day AND properties.$host != ''
			GROUP BY host
			ORDER BY events DESC
			LIMIT 8`,
		),
	]);

	const series = (seriesRows as Array<[string, number]>).map(([day, events]) => ({
		day,
		events: Number(events),
	}));
	const [totalEvents, uniquePersons, pageviews, sessions, countries] =
		(totalsRows[0] as [number, number, number, number, number]) ?? [0, 0, 0, 0, 0];
	const [allTimeEvents, allTimePersons] = (allTimeRows[0] as [number, number]) ?? [0, 0];
	const sites: PostHogSite[] = (siteRows as Array<[string, number]>).map(([host, events]) => ({
		host: String(host),
		events: Number(events),
	}));

	return {
		series,
		totalEvents: Number(totalEvents),
		uniquePersons: Number(uniquePersons),
		pageviews: Number(pageviews),
		sessions: Number(sessions),
		countries: Number(countries),
		allTimeEvents: Number(allTimeEvents),
		allTimePersons: Number(allTimePersons),
		sites,
	};
}
