import { NextRequest, NextResponse } from "next/server";
import {
	PostHogConfigError,
	getPostHogInsights,
	getPostHogProjects,
	getPostHogRecentEvents,
	getPostHogSummary,
	getPostHogVisitorDetail,
} from "@/lib/posthog";

export async function GET(request: NextRequest) {
	const metric = request.nextUrl.searchParams.get("metric") || "summary";
	const projectId = request.nextUrl.searchParams.get("project") || undefined;

	try {
		switch (metric) {
			case "projects":
				return NextResponse.json(await getPostHogProjects());
			case "summary":
				return NextResponse.json(await getPostHogSummary(projectId));
			case "insights":
				return NextResponse.json(await getPostHogInsights(10, projectId));
			case "events":
				return NextResponse.json(await getPostHogRecentEvents(25, projectId));
			case "visitor": {
				const distinctId = request.nextUrl.searchParams.get("distinctId");
				if (!distinctId) {
					return NextResponse.json({ error: "Missing distinctId" }, { status: 400 });
				}
				return NextResponse.json(await getPostHogVisitorDetail(distinctId, projectId));
			}
			default:
				return NextResponse.json({ error: "Unknown metric" }, { status: 400 });
		}
	} catch (error) {
		if (error instanceof PostHogConfigError) {
			return NextResponse.json(
				{
					code: "missing_posthog_config",
					error: "PostHog is not configured",
					message: error.message,
					requiredEnv: "POSTHOG_API_KEY, POSTHOG_PROJECTS",
				},
				{ status: 503 },
			);
		}

		console.error("[API] PostHog error:", error);
		return NextResponse.json({ error: "Failed to fetch PostHog data" }, { status: 500 });
	}
}
