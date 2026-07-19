import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

function isAuthorized(request: NextRequest): boolean {
	const secret = process.env.DASHBOARD_ADMIN_SECRET;
	if (!secret) {
		return true;
	}
	const header = request.headers.get("authorization") ?? "";
	const provided = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
	const expected = Buffer.from(secret);
	const actual = Buffer.from(provided);
	return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;

	try {
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
        meta,
        is_internal
      FROM visitors
      WHERE id = ${id} OR fingerprint = ${id}
      LIMIT 1
    `;

		if (!visitor) {
			return NextResponse.json({ error: "Visitor not found" }, { status: 404 });
		}

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

		let sessionsRows: readonly Record<string, unknown>[] = [];
		try {
			sessionsRows = await sql`
        SELECT
          session_id,
          started_at,
          last_event_at,
          entry_path,
          exit_path,
          referrer,
          pageviews,
          events,
          duration_ms,
          country,
          device_type
        FROM sessions
        WHERE visitor_id = ${visitor.fingerprint}
        ORDER BY started_at DESC
        LIMIT 30
      `;
		} catch {
			sessionsRows = [];
		}

		const sessions =
			sessionsRows.length > 0
				? sessionsRows.map((s) => ({
						sessionId: s.session_id,
						startedAt: s.started_at,
						endedAt: s.last_event_at,
						durationMs: s.duration_ms !== null ? Number(s.duration_ms) : null,
						entryPath: s.entry_path,
						exitPath: s.exit_path,
						referrer: s.referrer,
						pageviews: Number(s.pageviews ?? 0),
						events: Number(s.events ?? 0),
						country: s.country,
						deviceType: s.device_type,
					}))
				: await (async () => {
						const grouped = await sql`
              SELECT
                session_id,
                MIN(ts) as started_at,
                MAX(ts) as ended_at,
                COUNT(*) as events,
                COUNT(*) FILTER (WHERE type = 'pageview') as pageviews,
                array_agg(path ORDER BY ts) FILTER (WHERE path IS NOT NULL) as paths
              FROM events
              WHERE visitor_id = ${visitor.fingerprint}
                AND session_id IS NOT NULL
              GROUP BY session_id
              ORDER BY started_at DESC
              LIMIT 30
            `;
						return grouped.map((s) => {
							const paths = (s.paths as string[] | null) || [];
							const started = new Date(s.started_at as string);
							const ended = new Date(s.ended_at as string);
							return {
								sessionId: s.session_id,
								startedAt: s.started_at,
								endedAt: s.ended_at,
								durationMs: ended.getTime() - started.getTime(),
								entryPath: paths[0] ?? null,
								exitPath: paths[paths.length - 1] ?? null,
								referrer: null,
								pageviews: Number(s.pageviews),
								events: Number(s.events),
								country: null,
								deviceType: null,
							};
						});
					})();

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
				isInternal: Boolean(visitor.is_internal),
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
			sessions,
		});
	} catch (error) {
		console.error("[API] Visitor detail error:", error);
		return NextResponse.json({ error: "Failed to fetch visitor" }, { status: 500 });
	}
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;

	if (!isAuthorized(request)) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const body = await request.json().catch(() => ({}));
		const isInternal = Boolean(body?.isInternal);

		const [visitor] = await sql`
      SELECT id, fingerprint FROM visitors WHERE id = ${id} OR fingerprint = ${id} LIMIT 1
    `;

		if (!visitor) {
			return NextResponse.json({ error: "Visitor not found" }, { status: 404 });
		}

		await sql`
      UPDATE visitors SET is_internal = ${isInternal} WHERE fingerprint = ${visitor.fingerprint}
    `;

		await sql`
      UPDATE events SET is_internal = ${isInternal} WHERE visitor_id = ${visitor.fingerprint}
    `;

		return NextResponse.json({
			fingerprint: visitor.fingerprint,
			isInternal,
		});
	} catch (error) {
		console.error("[API] Visitor internal-toggle error:", error);
		return NextResponse.json({ error: "Failed to update visitor" }, { status: 500 });
	}
}
