import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
	const searchParams = request.nextUrl.searchParams;
	const metric = searchParams.get("metric") || "overview";
	const projectId = searchParams.get("projectId") || null;
	const projectFilter = projectId || undefined;
	const rawOrigin = searchParams.get("origin") || null;
	const origin = rawOrigin && rawOrigin.length <= 255 ? rawOrigin : null;
	const rawExcludeVisitorId = searchParams.get("excludeVisitorId") || null;
	const excludeVisitorId =
		rawExcludeVisitorId && rawExcludeVisitorId.length <= 128 ? rawExcludeVisitorId : null;

	// Global geo filter (country/region) — applied to the high-value metrics below;
	// geo-* cases re-read the same params as their drill scope.
	const rawGeoCountry = searchParams.get("country");
	const rawGeoRegion = searchParams.get("region");
	const geoScope =
		rawGeoCountry && /^[A-Za-z]{2}$/.test(rawGeoCountry)
			? {
					country: rawGeoCountry.toUpperCase(),
					region: rawGeoRegion && rawGeoRegion.length <= 64 ? rawGeoRegion : null,
				}
			: null;

	let from: Date;
	let to: Date;

	const rawFrom = searchParams.get("from");
	const rawTo = searchParams.get("to");

	if (rawFrom && rawTo) {
		from = new Date(rawFrom);
		to = new Date(rawTo);
		to.setHours(23, 59, 59, 999);
		if (isNaN(from.getTime()) || isNaN(to.getTime()) || from >= to) {
			return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
		}
	} else {
		const rawTimeRange = searchParams.get("timeRange") || "30d";
		const VALID_RANGES = new Set(["24h", "7d", "30d", "60d", "90d", "180d", "all"]);
		if (!VALID_RANGES.has(rawTimeRange)) {
			return NextResponse.json({ error: `Invalid timeRange: ${rawTimeRange}` }, { status: 400 });
		}
		const hours =
			rawTimeRange === "24h"
				? 24
				: rawTimeRange === "7d"
					? 168
					: rawTimeRange === "60d"
						? 1440
						: rawTimeRange === "90d"
							? 2160
							: rawTimeRange === "180d"
								? 4320
								: 720;
		to = new Date();
		from = rawTimeRange === "all" ? new Date(0) : new Date(to.getTime() - hours * 60 * 60 * 1000);
	}

	try {
		if (!process.env.DATABASE_URL) {
			return NextResponse.json(
				{
					code: "missing_database_url",
					error: "Database connection is not configured",
					message: "Set DATABASE_URL to connect the dashboard to Neon.",
					requiredEnv: "DATABASE_URL",
				},
				{ status: 503 },
			);
		}

		const query = await import("@/lib/queries");

		switch (metric) {
			case "projects":
				return NextResponse.json(await query.getProjects(excludeVisitorId));
			case "origins":
				return NextResponse.json(await query.getOrigins(projectId, excludeVisitorId));
			case "overview-extended":
				return NextResponse.json(
					await query.getOverviewExtended(from, to, projectId, excludeVisitorId, origin, geoScope),
				);
			case "pages":
				return NextResponse.json(
					await query.getTopPages(projectFilter, 10, from, to, excludeVisitorId, origin, geoScope),
				);
			case "referrers":
				return NextResponse.json(
					await query.getTopReferrers(projectFilter, 10, from, to, excludeVisitorId, origin, geoScope),
				);
			case "geo":
				return NextResponse.json(
					await query.getGeoDistribution(projectFilter, 100, from, to, excludeVisitorId, origin),
				);
			case "geo-explorer": {
				const rawCountry = searchParams.get("country");
				const rawRegion = searchParams.get("region");
				const scopeCountry =
					rawCountry && /^[A-Za-z]{2}$/.test(rawCountry) ? rawCountry.toUpperCase() : null;
				const scopeRegion = rawRegion && rawRegion.length <= 64 && scopeCountry ? rawRegion : null;
				return NextResponse.json(
					await query.getGeoExplorer(
						from,
						to,
						projectId,
						scopeCountry,
						scopeRegion,
						excludeVisitorId,
						origin,
					),
				);
			}
			case "geo-visitors": {
				const rawCountry = searchParams.get("country");
				const rawRegion = searchParams.get("region");
				const rawCity = searchParams.get("city");
				const scopeCountry =
					rawCountry && /^[A-Za-z]{2}$/.test(rawCountry) ? rawCountry.toUpperCase() : null;
				const scopeRegion = rawRegion && rawRegion.length <= 64 && scopeCountry ? rawRegion : null;
				const scopeCity = rawCity && rawCity.length <= 64 && scopeRegion ? rawCity : null;
				return NextResponse.json(
					await query.getGeoVisitors(
						from,
						to,
						projectId,
						scopeCountry,
						scopeRegion,
						scopeCity,
						20,
						excludeVisitorId,
						origin,
					),
				);
			}
			case "geo-detail":
				return NextResponse.json(
					await query.getGeoDetail(from, to, projectId, excludeVisitorId, origin),
				);
			case "devices":
				return NextResponse.json(
					await query.getDeviceBreakdown(projectFilter, from, to, excludeVisitorId, origin, geoScope),
				);
			case "trend": {
				const durationHours = Math.round((to.getTime() - from.getTime()) / (60 * 60 * 1000));
				return NextResponse.json(
					await query.getPageviewsTrend(
						projectFilter,
						durationHours,
						from,
						to,
						excludeVisitorId,
						origin,
						geoScope,
					),
				);
			}
			case "events":
				return NextResponse.json(
					await query.getRecentEvents(projectFilter, 20, from, to, excludeVisitorId, origin),
				);
			case "visitors":
				return NextResponse.json(
					await query.getRecentVisitors(projectId, 50, from, to, excludeVisitorId, origin),
				);
			case "geo-cities":
				const country = searchParams.get("country");
				return NextResponse.json(
					await query.getGeoCities(from, to, country, projectId, excludeVisitorId, origin),
				);
			case "referrer-detail":
				const domain = searchParams.get("domain");
				if (!domain) {
					return NextResponse.json({ error: "Domain required" }, { status: 400 });
				}
				return NextResponse.json(
					await query.getReferrerDetail(from, to, domain, projectId, excludeVisitorId, origin),
				);
			case "web-vitals":
				return NextResponse.json(
					await query.getWebVitals(from, to, projectId, excludeVisitorId, origin),
				);
			case "session-stats":
				return NextResponse.json(
					await query.getSessionStats(from, to, projectId, excludeVisitorId, origin, geoScope),
				);
			case "utm-campaigns":
				return NextResponse.json(
					await query.getUTMCampaigns(from, to, projectId, excludeVisitorId, origin),
				);
			case "bot-breakdown":
				return NextResponse.json(
					await query.getBotBreakdown(from, to, projectId, excludeVisitorId, origin),
				);
			case "engagement":
				return NextResponse.json(
					await query.getEngagementMetrics(from, to, projectId, excludeVisitorId, origin, geoScope),
				);
			case "hourly-heatmap":
				return NextResponse.json(
					await query.getHourlyHeatmap(from, to, projectId, excludeVisitorId, origin),
				);
			case "browsers-detailed":
				return NextResponse.json(
					await query.getBrowsersDetailed(from, to, projectId, excludeVisitorId, origin),
				);
			case "os-detailed":
				return NextResponse.json(
					await query.getOSDetailed(from, to, projectId, excludeVisitorId, origin),
				);
			case "languages":
				return NextResponse.json(
					await query.getLanguages(from, to, projectId, excludeVisitorId, origin),
				);
			case "screen-sizes":
				return NextResponse.json(
					await query.getScreenSizes(from, to, projectId, excludeVisitorId, origin),
				);
			case "connection-types":
				return NextResponse.json(
					await query.getConnectionTypes(from, to, projectId, excludeVisitorId, origin),
				);
			case "entry-exit-pages":
				return NextResponse.json(
					await query.getEntryExitPages(from, to, projectId, excludeVisitorId, origin),
				);
			case "live-now":
				return NextResponse.json(await query.getLiveNow(projectId, excludeVisitorId, origin));
			case "retention":
				return NextResponse.json(await query.getRetention(projectId, excludeVisitorId, origin));
			case "paths":
				return NextResponse.json(
					await query.getTopPaths(from, to, projectId, excludeVisitorId, origin),
				);
			case "country-detail":
				const c = searchParams.get("country");
				if (!c) {
					return NextResponse.json({ error: "Country required" }, { status: 400 });
				}
				return NextResponse.json(
					await query.getCountryDetail(from, to, c, projectId, excludeVisitorId, origin),
				);
			case "visitors-explorer": {
				const segment = (searchParams.get("segment") || "all") as "all" | "new" | "returning";
				const sort = (searchParams.get("sort") || "last_seen") as
					| "last_seen"
					| "visit_count"
					| "first_seen";
				const limit = Math.min(parseInt(searchParams.get("limit") || "25", 10) || 25, 100);
				const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10) || 0, 0);
				return NextResponse.json(
					await query.getVisitorsExplorer(
						from,
						to,
						projectId,
						segment,
						sort,
						limit,
						offset,
						excludeVisitorId,
						origin,
						geoScope,
					),
				);
			}
			case "visitor-recurrence":
				return NextResponse.json(
					await query.getVisitorRecurrence(from, to, projectId, excludeVisitorId),
				);
			case "segments":
				const segmentId = searchParams.get("segment") || "all";
				return NextResponse.json(
					await query.getSegmentedMetrics(from, to, segmentId, projectId, excludeVisitorId, origin),
				);
			case "skriuw-events":
				return NextResponse.json(
					await query.getSkriuwEventCounts(projectFilter ?? "skriuw", from, to, excludeVisitorId),
				);
			case "skriuw-trend":
				return NextResponse.json(
					await query.getSkriuwEventTrend(projectFilter ?? "skriuw", from, to, excludeVisitorId),
				);
			case "skriuw-notes":
				return NextResponse.json(
					await query.getSkriuwNotesActivity(projectFilter ?? "skriuw", from, to, excludeVisitorId),
				);
			case "skriuw-journal":
				return NextResponse.json(
					await query.getSkriuwJournalActivity(
						projectFilter ?? "skriuw",
						from,
						to,
						excludeVisitorId,
					),
				);
			case "skriuw-auth":
				return NextResponse.json(
					await query.getSkriuwAuthMetrics(projectFilter ?? "skriuw", from, to, excludeVisitorId),
				);
			case "skriuw-recent":
				const skriuwLimit = parseInt(searchParams.get("limit") || "50");
				return NextResponse.json(
					await query.getSkriuwRecentEvents(
						projectFilter ?? "skriuw",
						skriuwLimit,
						from,
						to,
						excludeVisitorId,
					),
				);
			case "skriuw-searches":
				return NextResponse.json(
					await query.getSkriuwTopSearches(
						projectFilter ?? "skriuw",
						20,
						from,
						to,
						excludeVisitorId,
					),
				);
			default:
				return NextResponse.json({ error: "Unknown metric" }, { status: 400 });
		}
	} catch (error) {
		console.error("[API] Analytics error:", error);
		return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
	}
}
