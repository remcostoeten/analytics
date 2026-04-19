if (typeof window !== "undefined" && !window.encodeURIComponent) {
	window.encodeURIComponent = encodeURIComponent;
}
import { PGlite } from "@electric-sql/pglite";

export async function setupTestDb() {
	const pg = new PGlite();

	// Create necessary tables for dashboard queries
	await pg.exec(`
        CREATE TABLE IF NOT EXISTS events (
            id BIGSERIAL PRIMARY KEY,
            project_id TEXT,
            type TEXT DEFAULT 'pageview',
            ts TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            path TEXT,
            referrer TEXT,
            origin TEXT,
            host TEXT,
            is_localhost BOOLEAN DEFAULT FALSE,
            ua TEXT,
            lang TEXT,
            device_type TEXT,
            ip_hash TEXT,
            visitor_id TEXT,
            session_id TEXT,
            country TEXT,
            region TEXT,
            city TEXT,
            meta JSONB
        );

        CREATE TABLE IF NOT EXISTS visitors (
            id BIGSERIAL PRIMARY KEY,
            fingerprint TEXT NOT NULL UNIQUE,
            first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            visit_count INTEGER DEFAULT 1,
            is_internal BOOLEAN DEFAULT FALSE,
            device_type TEXT,
            os TEXT,
            os_version TEXT,
            browser TEXT,
            browser_version TEXT,
            screen_resolution TEXT,
            timezone TEXT,
            language TEXT,
            country TEXT,
            region TEXT,
            city TEXT,
            ip_hash TEXT,
            ua TEXT,
            meta JSONB
        );
    `);

	return { pg, cleanup: () => pg.close() };
}
