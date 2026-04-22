import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
	const searchParams = request.nextUrl.searchParams;
	const timeRange = searchParams.get("timeRange") || "24h";
	const metric = searchParams.get("metric") || "overview";
	const projectId = searchParams.get("projectId") || null;
	const projectFilter = projectId || undefined;

	const hours =
		timeRange === "1h"
			? 1
			: timeRange === "6h"
				? 6
				: timeRange === "24h"
					? 24
					: timeRange === "7d"
						? 168
						: timeRange === "30d"
							? 720
							: 24;

	const from = new Date(Date.now() - hours * 60 * 60 * 1000);
	const to = new Date();

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
				return NextResponse.json(await query.getProjects());
			case "overview-extended":
				return NextResponse.json(await query.getOverviewExtended(from, to, projectId));
			case "pages":
				return NextResponse.json(await query.getTopPages(projectFilter));
			case "referrers":
				return NextResponse.json(await query.getTopReferrers(projectFilter));
			case "geo":
				return NextResponse.json(await query.getGeoDistribution(projectFilter));
			case "devices":
				return NextResponse.json(await query.getDeviceBreakdown(projectFilter));
			case "trend":
				return NextResponse.json(await query.getPageviewsTrend(projectFilter));
			case "events":
				return NextResponse.json(await query.getRecentEvents(projectFilter));
			case "visitors":
				return NextResponse.json(await query.getRecentVisitors(projectId));
			case "geo-cities":
				const country = searchParams.get("country");
				return NextResponse.json(await query.getGeoCities(from, to, country, projectId));
			case "referrer-detail":
				const domain = searchParams.get("domain");
				if (!domain) {
					return NextResponse.json({ error: "Domain required" }, { status: 400 });
				}
				return NextResponse.json(await query.getReferrerDetail(from, to, domain, projectId));
			case "web-vitals":
				return NextResponse.json(await query.getWebVitals(from, to, projectId));
			case "session-stats":
				return NextResponse.json(await query.getSessionStats(from, to, projectId));
			case "utm-campaigns":
				return NextResponse.json(await query.getUTMCampaigns(from, to, projectId));
			case "engagement":
				return NextResponse.json(await query.getEngagementMetrics(from, to, projectId));
			case "hourly-heatmap":
				return NextResponse.json(await query.getHourlyHeatmap(from, to, projectId));
			case "browsers-detailed":
				return NextResponse.json(await query.getBrowsersDetailed(from, to, projectId));
			case "os-detailed":
				return NextResponse.json(await query.getOSDetailed(from, to, projectId));
			case "languages":
				return NextResponse.json(await query.getLanguages(from, to, projectId));
			case "screen-sizes":
				return NextResponse.json(await query.getScreenSizes(from, to, projectId));
			case "connection-types":
				return NextResponse.json(await query.getConnectionTypes(from, to, projectId));
			case "entry-exit-pages":
				return NextResponse.json(await query.getEntryExitPages(from, to, projectId));
			case "live-now":
				return NextResponse.json(await query.getLiveNow(projectId));
			case "retention":
				return NextResponse.json(await query.getRetention(projectId));
			case "paths":
				return NextResponse.json(await query.getTopPaths(from, to, projectId));
			case "segments":
				const segmentId = searchParams.get("segment") || "all";
				return NextResponse.json(await query.getSegmentedMetrics(from, to, segmentId, projectId));
			default:
				return NextResponse.json({ error: "Unknown metric" }, { status: 400 });
		}
	} catch (error) {
		console.error("[API] Analytics error:", error);
		return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
	}
}
