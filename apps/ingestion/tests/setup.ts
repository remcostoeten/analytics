if (typeof globalThis !== "undefined") {
	const g = globalThis as any;
	if (typeof g.window !== "undefined") {
		if (!g.window.encodeURIComponent) g.window.encodeURIComponent = encodeURIComponent;
		if (!g.window.location) g.window.location = { pathname: "/" };
	} else {
		g.window = g;
		g.encodeURIComponent = encodeURIComponent;
		g.location = { pathname: "/" };
	}
}
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "../src/db/index.js";

export async function setupTestDb() {
	const pg = new PGlite();
	const db = drizzle(pg, { schema });

	await pg.exec(`
        CREATE TABLE IF NOT EXISTS events (
            id BIGSERIAL PRIMARY KEY,
            project_id TEXT NOT NULL,
            type TEXT NOT NULL DEFAULT 'pageview',
            ts TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
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
            first_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            visit_count INTEGER NOT NULL DEFAULT 1,
            is_internal BOOLEAN NOT NULL DEFAULT FALSE,
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

	return { db, pg, cleanup: () => pg.close() };
}
