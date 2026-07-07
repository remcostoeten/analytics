import { NextRequest, NextResponse } from "next/server";
import {
	PostHogConfigError,
	getPostHogInsights,
	getPostHogRecentEvents,
	getPostHogSummary,
} from "@/lib/posthog";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
	const metric = request.nextUrl.searchParams.get("metric") || "summary";

	try {
		switch (metric) {
			case "summary":
				return NextResponse.json(await getPostHogSummary());
			case "insights":
				return NextResponse.json(await getPostHogInsights(10));
			case "events":
				return NextResponse.json(await getPostHogRecentEvents(25));
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
					requiredEnv: "POSTHOG_API_KEY, POSTHOG_PROJECT_ID",
				},
				{ status: 503 },
			);
		}

		console.error("[API] PostHog error:", error);
		return NextResponse.json({ error: "Failed to fetch PostHog data" }, { status: 500 });
	}
}
