import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { events, resume, visitors, visitorEvents } from "./schema";

function getDbClient() {
	const databaseUrl = process.env.DATABASE_URL;

	if (!databaseUrl) {
		// Return dummy client during build or test if url is missing, or if env not set
		return {
			select: () => ({ from: () => [] }),
			insert: () => ({ values: () => ({ returning: () => [] }) }),
			execute: async () => ({ rows: [] }),
		} as any;
	}

	const sql = neon(databaseUrl);
	return drizzle(sql, { schema: { events, resume, visitors, visitorEvents } });
}

export const db = getDbClient();
