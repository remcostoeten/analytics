import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { events, visitors, sessions } from "./schema";

function createDb(databaseUrl: string) {
	const sql = neon(databaseUrl);
	return drizzle(sql, { schema: { events, visitors, sessions } });
}

type DbClient = ReturnType<typeof createDb>;

function createFallbackDb(): DbClient {
	return {
		select() {
			return {
				from() {
					return [];
				},
			};
		},
		insert() {
			return {
				values() {
					return {
						returning() {
							return [];
						},
					};
				},
			};
		},
		async execute() {
			return { rows: [] };
		},
	} as unknown as DbClient;
}

function getDbClient(): DbClient {
	const databaseUrl = process.env.DATABASE_URL;

	if (!databaseUrl) {
		console.error("[DB] DATABASE_URL not set — ingestion running without persistence");
		return createFallbackDb();
	}

	return createDb(databaseUrl);
}

export const db = getDbClient();
