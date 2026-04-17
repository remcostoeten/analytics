import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;

	try {
		// Get visitor details
		const [visitor] = await sql`
      SELECT 
        id,
        fingerprint,
        first_seen,
        last_seen,
        visit_count,
        device_type,
        os,
        os_version,
        browser,
        browser_version,
        screen_resolution,
        timezone,
        language,
        country,
        region,
        city,
        ua,
        meta
      FROM visitors 
      WHERE id = ${id} OR fingerprint = ${id}
      LIMIT 1
    `;

		if (!visitor) {
			return NextResponse.json({ error: "Visitor not found" }, { status: 404 });
		}

		// Get visitor's recent events
		const events = await sql`
      SELECT 
        id,
        type,
        path,
        ts,
        referrer,
        session_id,
        meta
      FROM events 
      WHERE visitor_id = ${visitor.fingerprint}
      ORDER BY ts DESC
      LIMIT 50
    `;

		// Get visitor's sessions
		const sessions = await sql`
      SELECT 
        session_id,
        MIN(ts) as started_at,
        MAX(ts) as ended_at,
        COUNT(*) as events,
        COUNT(*) FILTER (WHERE type = 'pageview') as pageviews,
        array_agg(DISTINCT path) FILTER (WHERE path IS NOT NULL) as paths
      FROM events 
      WHERE visitor_id = ${visitor.fingerprint}
        AND session_id IS NOT NULL
      GROUP BY session_id
      ORDER BY started_at DESC
      LIMIT 20
    `;

		return NextResponse.json({
			visitor: {
				id: String(visitor.id),
				fingerprint: visitor.fingerprint,
				firstSeen: visitor.first_seen,
				lastSeen: visitor.last_seen,
				visitCount: Number(visitor.visit_count),
				deviceType: visitor.device_type,
				os: visitor.os,
				osVersion: visitor.os_version,
				browser: visitor.browser,
				browserVersion: visitor.browser_version,
				screenResolution: visitor.screen_resolution,
				timezone: visitor.timezone,
				language: visitor.language,
				country: visitor.country,
				region: visitor.region,
				city: visitor.city,
				userAgent: visitor.ua,
				meta: visitor.meta,
			},
			events: events.map((e) => ({
				id: String(e.id),
				type: e.type,
				path: e.path,
				timestamp: e.ts,
				referrer: e.referrer,
				sessionId: e.session_id,
				meta: e.meta,
			})),
			sessions: sessions.map((s) => ({
				sessionId: s.session_id,
				startedAt: s.started_at,
				endedAt: s.ended_at,
				events: Number(s.events),
				pageviews: Number(s.pageviews),
				paths: s.paths,
			})),
		});
	} catch (error) {
		console.error("[API] Visitor detail error:", error);
		return NextResponse.json({ error: "Failed to fetch visitor" }, { status: 500 });
	}
}
